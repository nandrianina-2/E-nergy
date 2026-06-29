import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PaymentRequest, Invoice } from "@/lib/models";
import {
  requireAuth,
  assertSubmeterAccess,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";
import { createPaymentRequestSchema } from "@/lib/validations";
import { notifyAllAdmins } from "@/lib/services/notifications";
import { formatCurrency } from "@/lib/utils";

const operatorLabels: Record<string, string> = {
  mvola: "MVola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
  cash: "Espèces",
};

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const status = searchParams.get("status") || "";

    const query: Record<string, unknown> = {};

    if (session.user.role === "user") {
      query.userId = session.user.id;
    } else if (session.user.role === "admin") {
      if (!session.user.organizationId) {
        return NextResponse.json({
          paymentRequests: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query.organizationId = session.user.organizationId;
      if (status) query.status = status;
    } else if (session.user.role === "super_admin") {
      const requestedOrgId = searchParams.get("organizationId");
      if (requestedOrgId) query.organizationId = requestedOrgId;
      if (status) query.status = status;
    }

    const total = await PaymentRequest.countDocuments(query);
    const paymentRequests = await PaymentRequest.find(query)
      .populate("invoiceId", "invoiceNumber period totalAmount amountPaid")
      .populate("submeterId", "code label")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      paymentRequests,
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
    const session = await requireAuth();
    await connectDB();

    if (!session.user.organizationId) {
      throw new ApiError(
        "Votre compte n'est rattaché à aucune organisation",
        403
      );
    }
    const organizationId = session.user.organizationId;

    const body = await req.json();
    const data = createPaymentRequestSchema.parse(body);

    const invoice = await Invoice.findOne({
      _id: data.invoiceId,
      organizationId,
    });
    if (!invoice) {
      throw new ApiError("Facture introuvable", 404);
    }

    assertSubmeterAccess(session, invoice.submeterId.toString());

    if (invoice.paymentStatus === "paid") {
      throw new ApiError("Cette facture est déjà payée", 409);
    }

    const existingPending = await PaymentRequest.findOne({
      invoiceId: data.invoiceId,
      status: "pending",
    });
    if (existingPending) {
      throw new ApiError(
        "Une demande de paiement est déjà en attente de validation pour cette facture",
        409
      );
    }

    const remainingAmount = invoice.totalAmount - invoice.amountPaid;

    const paymentRequest = await PaymentRequest.create({
      organizationId,
      invoiceId: invoice._id,
      submeterId: invoice.submeterId,
      userId: session.user.id,
      amount: remainingAmount,
      method: data.method,
      status: "pending",
    });

    await notifyAllAdmins({
      type: "general",
      title: "Nouvelle demande de paiement",
      message: `${session.user.name} a déclaré un paiement de ${formatCurrency(
        remainingAmount
      )} pour la facture ${invoice.invoiceNumber} via ${
        operatorLabels[data.method]
      }. Validation requise.`,
      link: "/admin/payment-requests",
      organizationId,
    });

    return NextResponse.json({ paymentRequest }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
