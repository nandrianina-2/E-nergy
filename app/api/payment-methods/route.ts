import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PaymentMethod } from "@/lib/models";
import { requireOrgScope, requireOrgScopeStrict, handleApiError, ApiError } from "@/lib/api-helpers";
import { upsertPaymentMethodSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    // Visible par tout utilisateur connecté de l'organisation (nécessaire
    // pour proposer les options de paiement côté utilisateur final).
    const { organizationId } = await requireOrgScope(req);
    if (!organizationId) {
      return NextResponse.json({ paymentMethods: [] });
    }
    await connectDB();

    const paymentMethods = await PaymentMethod.find({ organizationId }).sort({
      operator: 1,
    });
    return NextResponse.json({ paymentMethods });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();

    const body = await req.json();
    const data = upsertPaymentMethodSchema.parse(body);

    // Upsert par opérateur ET par organisation : chaque admin a sa propre
    // configuration MVola/Orange/Airtel, indépendante des autres.
    const paymentMethod = await PaymentMethod.findOneAndUpdate(
      { organizationId, operator: data.operator },
      { ...data, organizationId },
      { upsert: true, new: true }
    );

    return NextResponse.json({ paymentMethod }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
