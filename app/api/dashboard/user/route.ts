import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Reading, Invoice, Submeter } from "@/lib/models";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";
import { getCurrentPeriod } from "@/lib/utils";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    if (!session.user.submeterId) {
      throw new ApiError(
        "Aucun sous-compteur n'est associé à votre compte. Contactez l'administrateur.",
        404
      );
    }

    const submeter = await Submeter.findById(session.user.submeterId);
    if (!submeter) {
      throw new ApiError("Sous-compteur introuvable", 404);
    }

    const currentPeriod = getCurrentPeriod();

    const currentReading = await Reading.findOne({
      submeterId: submeter._id,
      period: currentPeriod,
    });

    const last6Readings = await Reading.find({ submeterId: submeter._id })
      .sort({ period: -1 })
      .limit(6);

    const invoices = await Invoice.find({ submeterId: submeter._id }).sort({
      createdAt: -1,
    });

    const unpaidInvoices = invoices.filter(
      (i) => i.paymentStatus !== "paid"
    );
    const unpaidAmount = unpaidInvoices.reduce(
      (sum, i) => sum + (i.totalAmount - i.amountPaid),
      0
    );

    return NextResponse.json({
      submeter,
      currentPeriod,
      hasSubmittedCurrentReading: !!currentReading,
      currentReading,
      last6Readings,
      recentInvoices: invoices.slice(0, 5),
      unpaidInvoicesCount: unpaidInvoices.length,
      unpaidAmount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
