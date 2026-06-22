import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PaymentMethod } from "@/lib/models";
import { requireAdmin, requireAuth, handleApiError } from "@/lib/api-helpers";
import { upsertPaymentMethodSchema } from "@/lib/validations";

export async function GET() {
  try {
    // Visible par tout utilisateur connecté (nécessaire pour proposer les options de paiement)
    await requireAuth();
    await connectDB();

    const paymentMethods = await PaymentMethod.find().sort({ operator: 1 });
    return NextResponse.json({ paymentMethods });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await req.json();
    const data = upsertPaymentMethodSchema.parse(body);

    // Upsert par opérateur : un seul enregistrement par opérateur
    const paymentMethod = await PaymentMethod.findOneAndUpdate(
      { operator: data.operator },
      data,
      { upsert: true, new: true }
    );

    return NextResponse.json({ paymentMethod }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
