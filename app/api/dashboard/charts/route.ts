import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Reading, Invoice, MainMeter } from "@/lib/models";
import { requireAdmin, handleApiError } from "@/lib/api-helpers";

function getLastNPeriods(n: number): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get("months") || "6");
    const periods = getLastNPeriods(months);

    const consumptionByPeriod = await Promise.all(
      periods.map(async (period) => {
        const readings = await Reading.find({ period });
        const mainMeter = await MainMeter.findOne({
          periodStart: {
            $gte: new Date(`${period}-01`),
            $lt: new Date(
              new Date(`${period}-01`).getFullYear(),
              new Date(`${period}-01`).getMonth() + 1,
              1
            ),
          },
        });

        return {
          period,
          submetersTotal: readings.reduce((s, r) => s + r.consumption, 0),
          mainMeterTotal: mainMeter ? mainMeter.consumption : null,
        };
      })
    );

    const paymentsByPeriod = await Promise.all(
      periods.map(async (period) => {
        const invoices = await Invoice.find({ period });
        const totalAmount = invoices.reduce((s, i) => s + i.totalAmount, 0);
        const paidAmount = invoices.reduce((s, i) => s + i.amountPaid, 0);

        return {
          period,
          totalAmount,
          paidAmount,
          unpaidAmount: totalAmount - paidAmount,
        };
      })
    );

    const paymentStatusBreakdown = await Invoice.aggregate([
      { $group: { _id: "$paymentStatus", count: { $sum: 1 } } },
    ]);

    return NextResponse.json({
      consumptionByPeriod,
      paymentsByPeriod,
      paymentStatusBreakdown,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
