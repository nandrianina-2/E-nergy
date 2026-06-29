import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/lib/models";
import {
  requireAuth,
  assertSubmeterAccess,
  assertOrgAccess,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    const invoice = await Invoice.findById(id)
      .populate("submeterId", "code label userId")
      .populate("readingId")
      .populate("mainMeterId", "invoiceNumber periodStart periodEnd");

    if (!invoice) {
      throw new ApiError("Facture introuvable", 404);
    }

    assertSubmeterAccess(session, invoice.submeterId._id.toString());
    assertOrgAccess(session, invoice.organizationId.toString(), "Facture introuvable");

    return NextResponse.json({ invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
