import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Payment, Invoice } from "@/lib/models";
import { requireAuth, requireOrgScopeStrict, handleApiError, ApiError } from "@/lib/api-helpers";
import { recordPaymentSchema } from "@/lib/validations";
import { createNotification } from "@/lib/services/notifications";
import { paymentDecisionEmailTemplate } from "@/lib/services/email";
import { formatCurrency } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const invoiceId = searchParams.get("invoiceId") || "";

    const query: Record<string, unknown> = {};

    if (session.user.role === "user") {
      if (!session.user.submeterId) {
        return NextResponse.json({
          payments: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query.submeterId = session.user.submeterId;
    } else if (session.user.role === "admin") {
      if (!session.user.organizationId) {
        return NextResponse.json({
          payments: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query.organizationId = session.user.organizationId;
    } else if (session.user.role === "super_admin") {
      const requestedOrgId = searchParams.get("organizationId");
      if (requestedOrgId) query.organizationId = requestedOrgId;
    }

    if (invoiceId) query.invoiceId = invoiceId;

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate("invoiceId", "invoiceNumber period totalAmount")
      .populate("submeterId", "code label")
      .sort({ paymentDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      payments,
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
    const data = recordPaymentSchema.parse(body);

    const invoice = await Invoice.findOne({
      _id: data.invoiceId,
      organizationId,
    }).populate({
      path: "submeterId",
      populate: { path: "userId", select: "name email" },
    });
    if (!invoice) {
      throw new ApiError("Facture introuvable", 404);
    }

    const remainingBefore = invoice.totalAmount - invoice.amountPaid;
    if (data.amount > remainingBefore + 0.01) {
      throw new ApiError(
        `Le montant dépasse le reste à payer (${remainingBefore.toFixed(2)})`,
        400
      );
    }

    const payment = await Payment.create({
      organizationId,
      invoiceId: data.invoiceId,
      submeterId: invoice.submeterId._id,
      amount: data.amount,
      method: data.method,
      note: data.note,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      recordedBy: session.user.id,
    });

    invoice.amountPaid += data.amount;
    invoice.paymentStatus =
      invoice.amountPaid >= invoice.totalAmount - 0.01
        ? "paid"
        : invoice.amountPaid > 0
        ? "partial"
        : "unpaid";
    await invoice.save();

    const submeter = invoice.submeterId as unknown as {
      userId?: { _id: string; name: string; email: string };
      code: string;
      label: string;
    };

    if (submeter.userId) {
      await createNotification({
        userId: submeter.userId._id.toString(),
        type: "payment_received",
        title: "Paiement enregistré",
        message: `Un paiement de ${data.amount} Ar a été enregistré pour la facture ${invoice.invoiceNumber}. Statut : ${
          invoice.paymentStatus === "paid"
            ? "Payée intégralement"
            : "Partiellement payée"
        }.`,
        link: "/user/payments",
        sendEmailToo: true,
        emailHtml: paymentDecisionEmailTemplate({
          userName: submeter.userId.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: formatCurrency(data.amount),
          decision: "approved",
        }),
      });
    }

    return NextResponse.json({ payment, invoice }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
