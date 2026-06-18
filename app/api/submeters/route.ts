import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Submeter } from "@/lib/models";
import { requireAdmin, requireAuth, handleApiError } from "@/lib/api-helpers";
import { createSubmeterSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    // Un utilisateur normal ne peut voir que son propre sous-compteur
    const query: Record<string, unknown> = {};
    if (session.user.role !== "admin") {
      if (!session.user.submeterId) {
        return NextResponse.json({
          submeters: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query._id = session.user.submeterId;
    } else if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { label: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Submeter.countDocuments(query);
    const submeters = await Submeter.find(query)
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      submeters,
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
    await requireAdmin();
    await connectDB();

    const body = await req.json();
    const data = createSubmeterSchema.parse(body);

    const existing = await Submeter.findOne({ code: data.code });
    if (existing) {
      return NextResponse.json(
        { error: "Un sous-compteur avec ce code existe déjà" },
        { status: 409 }
      );
    }

    const submeter = await Submeter.create(data);

    return NextResponse.json({ submeter }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
