import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MainMeter, Invoice } from "@/lib/models";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api-helpers";
import { createMainMeterSchema } from "@/lib/validations";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await connectDB();
    const { id } = await params;

    const mainMeter = await MainMeter.findById(id);
    if (!mainMeter) {
      throw new ApiError("Facture principale introuvable", 404);
    }

    return NextResponse.json({ mainMeter });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await connectDB();
    const { id } = await params;

    const mainMeter = await MainMeter.findById(id);
    if (!mainMeter) {
      throw new ApiError("Facture principale introuvable", 404);
    }

    if (mainMeter.status === "allocated") {
      throw new ApiError(
        "Cette facture a déjà été répartie et ne peut plus être modifiée",
        409
      );
    }

    const body = await req.json();
    const data = createMainMeterSchema.partial().parse(body);

    Object.assign(mainMeter, data);

    if (data.oldIndex !== undefined || data.newIndex !== undefined) {
      mainMeter.consumption = mainMeter.newIndex - mainMeter.oldIndex;
    }

    await mainMeter.save();

    return NextResponse.json({ mainMeter });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await connectDB();
    const { id } = await params;

    const mainMeter = await MainMeter.findById(id);
    if (!mainMeter) {
      throw new ApiError("Facture principale introuvable", 404);
    }

    const hasInvoices = await Invoice.exists({ mainMeterId: id });
    if (hasInvoices) {
      throw new ApiError(
        "Impossible de supprimer : des factures de sous-compteurs ont déjà été générées à partir de cette facture",
        409
      );
    }

    await MainMeter.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
