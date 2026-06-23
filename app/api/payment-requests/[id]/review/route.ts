import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PaymentRequest, Invoice, Payment } from "@/lib/models";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api-helpers";
import { reviewPaymentRequestSchema } from "@/lib/validations";
import { createNotification } from "@/lib/services/notifications";
import { paymentDecisionEmailTemplate } from "@/lib/services/email";
import { formatCurrency } from "@/lib/utils";

interface Params {
  params: Promise<{ id: string }>;
}

const methodMap: Record<string, "cash" | "transfer" | "mobile_money" | "other"> = {
  mvola: "mobile_money",
  orange_money: "mobile_money",
  airtel_money: "mobile_money",
  cash: "cash",
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin();
    await connectDB();
    const { id } = await params;

    const body = await req.json();
    const data = reviewPaymentRequestSchema.parse(body);

    const paymentRequest = await PaymentRequest.findById(id).populate(
      "userId",
      "name email"
    );
    if (!paymentRequest) {
      throw new ApiError("Demande de paiement introuvable", 404);
    }

    if (paymentRequest.status !== "pending") {
      throw new ApiError("Cette demande a déjà été traitée", 409);
    }

    paymentRequest.status = data.decision;
    paymentRequest.reviewedBy = session.user.id as unknown as typeof paymentRequest.reviewedBy;
    paymentRequest.reviewedAt = new Date();
    if (data.decision === "rejected") {
      paymentRequest.rejectionReason = data.rejectionReason;
    }
    await paymentRequest.save();

    const invoice = await Invoice.findById(paymentRequest.invoiceId);
    if (!invoice) {
      throw new ApiError("Facture associée introuvable", 404);
    }

    const requestUser = paymentRequest.userId as unknown as {
      _id: string;
      name: string;
      email: string;
    };

    if (data.decision === "approved") {
      await Payment.create({
        invoiceId: invoice._id,
        submeterId: invoice.submeterId,
        amount: paymentRequest.amount,
        method: methodMap[paymentRequest.method],
        note: `Validé via demande de paiement (${paymentRequest.method})`,
        paymentDate: new Date(),
        recordedBy: session.user.id,
      });

      invoice.amountPaid += paymentRequest.amount;
      invoice.paymentStatus =
        invoice.amountPaid >= invoice.totalAmount - 0.01
          ? "paid"
          : invoice.amountPaid > 0
          ? "partial"
          : "unpaid";
      await invoice.save();

      await createNotification({
        userId: requestUser._id.toString(),
        type: "payment_received",
        title: "Paiement validé",
        message: `Votre paiement de ${formatCurrency(
          paymentRequest.amount
        )} pour la facture ${invoice.invoiceNumber} a été validé.`,
        link: "/user/payments",
        sendEmailToo: true,
        emailHtml: paymentDecisionEmailTemplate({
          userName: requestUser.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: formatCurrency(paymentRequest.amount),
          decision: "approved",
        }),
      });
    } else {
      await createNotification({
        userId: requestUser._id.toString(),
        type: "general",
        title: "Paiement rejeté",
        message: `Votre demande de paiement pour la facture ${
          invoice.invoiceNumber
        } a été rejetée.${
          data.rejectionReason ? ` Raison : ${data.rejectionReason}` : ""
        } Vous pouvez nous contacter via la discussion liée à cette facture.`,
        link: "/user/invoices",
        sendEmailToo: true,
        emailHtml: paymentDecisionEmailTemplate({
          userName: requestUser.name,
          invoiceNumber: invoice.invoiceNumber,
          amount: formatCurrency(paymentRequest.amount),
          decision: "rejected",
          rejectionReason: data.rejectionReason,
        }),
      });
    }

    return NextResponse.json({ paymentRequest, invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
