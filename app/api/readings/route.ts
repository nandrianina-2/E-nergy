import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Reading, Submeter } from "@/lib/models";
import {
  requireAuth,
  requireOrgScopeStrict,
  assertSubmeterAccess,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";
import { createReadingSchema } from "@/lib/validations";
import {
  notifyAllAdmins,
  createNotification,
} from "@/lib/services/notifications";
import { formatPeriod } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const submeterIdParam = searchParams.get("submeterId");
    const period = searchParams.get("period");

    const query: Record<string, unknown> = {};

    if (session.user.role === "user") {
      if (!session.user.submeterId) {
        return NextResponse.json({
          readings: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query.submeterId = session.user.submeterId;
    } else if (session.user.role === "admin") {
      if (!session.user.organizationId) {
        return NextResponse.json({
          readings: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query.organizationId = session.user.organizationId;
      if (submeterIdParam) query.submeterId = submeterIdParam;
    } else if (session.user.role === "super_admin") {
      const requestedOrgId = searchParams.get("organizationId");
      if (requestedOrgId) query.organizationId = requestedOrgId;
      if (submeterIdParam) query.submeterId = submeterIdParam;
    }

    if (period) {
      query.period = period;
    }

    const total = await Reading.countDocuments(query);
    const readings = await Reading.find(query)
      .populate("submeterId", "code label")
      .populate("submittedBy", "name")
      .sort({ period: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      readings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, organizationId } = await requireOrgScopeStrict(req);
    await connectDB();

    const body = await req.json();
    const data = createReadingSchema.parse(body);

    assertSubmeterAccess(session, data.submeterId);

    const submeter = await Submeter.findOne({
      _id: data.submeterId,
      organizationId,
    });
    if (!submeter) {
      throw new ApiError("Sous-compteur introuvable", 404);
    }

    const existing = await Reading.findOne({
      submeterId: data.submeterId,
      period: data.period,
    });
    if (existing) {
      throw new ApiError(
        "Un relevé existe déjà pour ce sous-compteur sur cette période",
        409
      );
    }

    // Détermine l'ancien index : dernier relevé connu, ou index initial du sous-compteur
    const lastReading = await Reading.findOne({
      submeterId: data.submeterId,
    }).sort({ period: -1 });

    const oldIndex = lastReading ? lastReading.newIndex : submeter.initialIndex;

    if (data.newIndex < oldIndex) {
      throw new ApiError(
        `Le nouvel index (${data.newIndex}) ne peut pas être inférieur à l'ancien index (${oldIndex})`,
        400
      );
    }

    const consumption = data.newIndex - oldIndex;

    const reading = await Reading.create({
      organizationId,
      submeterId: data.submeterId,
      period: data.period,
      oldIndex,
      newIndex: data.newIndex,
      consumption,
      submittedBy: session.user.id,
      submittedAt: new Date(),
    });

    const isStaffSubmitting =
      session.user.role === "admin" || session.user.role === "super_admin";

    if (isStaffSubmitting) {
      // L'admin a saisi à la place de l'utilisateur : on notifie l'utilisateur concerné
      if (submeter.userId) {
        await createNotification({
          userId: submeter.userId.toString(),
          type: "general",
          title: "Relevé saisi par l'administrateur",
          message: `L'administrateur a saisi votre relevé pour ${formatPeriod(
            data.period
          )} : consommation de ${consumption} kWh.`,
          link: "/user/readings",
        });
      }
    } else {
      await notifyAllAdmins({
        type: "general",
        title: "Nouveau relevé saisi",
        message: `Le sous-compteur ${submeter.label} (${submeter.code}) a déclaré une consommation de ${consumption} kWh pour la période ${data.period}.`,
        link: "/admin/readings",
        organizationId,
      });
    }

    return NextResponse.json({ reading }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
