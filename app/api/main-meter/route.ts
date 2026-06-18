import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MainMeter, Submeter, Reading } from "@/lib/models";
import { requireAdmin, handleApiError } from "@/lib/api-helpers";
import { createMainMeterSchema } from "@/lib/validations";
import { checkDiscrepancy } from "@/lib/services/allocation";
import { notifyAllAdmins } from "@/lib/services/notifications";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const total = await MainMeter.countDocuments();
    const mainMeters = await MainMeter.find()
      .sort({ periodStart: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      mainMeters,
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
    await requireAdmin();
    await connectDB();

    const body = await req.json();
    const data = createMainMeterSchema.parse(body);

    const consumption = data.newIndex - data.oldIndex;

    const mainMeter = await MainMeter.create({
      ...data,
      consumption,
    });

    // Vérification d'écart avec les relevés déjà saisis pour la même période (si applicable)
    const periodKey = `${new Date(data.periodStart).getFullYear()}-${String(
      new Date(data.periodStart).getMonth() + 1
    ).padStart(2, "0")}`;

    const readings = await Reading.find({ period: periodKey });
    if (readings.length > 0) {
      const discrepancy = checkDiscrepancy(
        consumption,
        readings.map((r) => r.consumption)
      );

      if (!discrepancy.isWithinTolerance) {
        await notifyAllAdmins({
          type: "discrepancy_alert",
          title: "Écart de consommation détecté",
          message: `Écart de ${discrepancy.differencePercent.toFixed(
            1
          )}% entre le compteur principal (${
            discrepancy.mainMeterConsumption
          } kWh) et la somme des sous-compteurs (${
            discrepancy.submetersTotalConsumption
          } kWh).`,
          link: "/admin/main-meter",
        });
      }
    }

    return NextResponse.json({ mainMeter }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
