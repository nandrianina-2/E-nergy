import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/lib/models";
import {
  requireAuth,
  assertSubmeterAccess,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";
import { generateInvoicePDF } from "@/lib/services/pdf";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findById(id)
      .populate({
        path: "submeterId",
        select: "code label userId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("readingId", "oldIndex newIndex");

    if (!invoice) {
      throw new ApiError("Facture introuvable", 404);
    }

    assertSubmeterAccess(session, invoice.submeterId._id.toString());

    const submeter = invoice.submeterId as unknown as {
      code: string;
      label: string;
      userId?: { name: string; email: string };
    };

    const reading = invoice.readingId as unknown as {
      oldIndex: number;
      newIndex: number;
    };

    const pdfBuffer = generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      submeterLabel: submeter.label,
      submeterCode: submeter.code,
      userName: submeter.userId?.name || "Utilisateur non assigné",
      userEmail: submeter.userId?.email || "-",
      period: invoice.period,
      oldIndex: reading?.oldIndex ?? 0,
      newIndex: reading?.newIndex ?? 0,
      consumption: invoice.consumption,
      unitPrice: invoice.unitPrice,
      amount: invoice.amount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      dueDate: invoice.dueDate.toISOString(),
      paymentStatus: invoice.paymentStatus,
      amountPaid: invoice.amountPaid,
      issuedAt: invoice.createdAt.toISOString(),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
