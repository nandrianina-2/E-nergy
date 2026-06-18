import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Reading } from "@/lib/models";
import { requireAdmin, handleApiError } from "@/lib/api-helpers";
import { checkDiscrepancy } from "@/lib/services/allocation";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");
    const mainMeterConsumption = parseFloat(
      searchParams.get("mainMeterConsumption") || "0"
    );

    if (!period) {
      return NextResponse.json(
        { error: "Le paramètre 'period' est requis (format YYYY-MM)" },
        { status: 400 }
      );
    }

    const readings = await Reading.find({ period });

    const discrepancy = checkDiscrepancy(
      mainMeterConsumption,
      readings.map((r) => r.consumption)
    );

    return NextResponse.json({
      discrepancy,
      readingsCount: readings.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
