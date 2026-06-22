import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PaymentMethod } from "@/lib/models";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await connectDB();
    const { id } = await params;

    const body = await req.json();
    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      throw new ApiError("Moyen de paiement introuvable", 404);
    }

    if (typeof body.isActive === "boolean") {
      paymentMethod.isActive = body.isActive;
    }
    if (body.transferCode) paymentMethod.transferCode = body.transferCode;
    if (body.ussdTemplate) paymentMethod.ussdTemplate = body.ussdTemplate;
    if (body.label) paymentMethod.label = body.label;

    await paymentMethod.save();

    return NextResponse.json({ paymentMethod });
  } catch (error) {
    return handleApiError(error);
  }
}
