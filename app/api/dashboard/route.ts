import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Submeter, User, Invoice, MainMeter, Reading } from "@/lib/models";
import { requireOrgScopeStrict, handleApiError } from "@/lib/api-helpers";
import { checkDiscrepancy } from "@/lib/services/allocation";
import { getCurrentPeriod } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();

    const currentPeriod = getCurrentPeriod();

    const [totalSubmeters, activeSubmeters, totalUsers] = await Promise.all([
      Submeter.countDocuments({ organizationId }),
      Submeter.countDocuments({ organizationId, isActive: true }),
      User.countDocuments({ organizationId, role: "user" }),
    ]);

    const currentReadings = await Reading.find({ organizationId, period: currentPeriod });
    const currentPeriodConsumption = currentReadings.reduce(
      (sum, r) => sum + r.consumption,
      0
    );

    const currentInvoices = await Invoice.find({ organizationId, period: currentPeriod });
    const currentPeriodAmount = currentInvoices.reduce(
      (sum, i) => sum + i.totalAmount,
      0
    );

    const unpaidInvoices = await Invoice.find({
      organizationId,
      paymentStatus: { $in: ["unpaid", "partial"] },
    });
    const unpaidInvoicesCount = unpaidInvoices.length;
    const unpaidAmount = unpaidInvoices.reduce(
      (sum, i) => sum + (i.totalAmount - i.amountPaid),
      0
    );

    const latestMainMeter = await MainMeter.findOne({ organizationId }).sort({
      periodStart: -1,
    });

    let discrepancy = null;
    if (latestMainMeter) {
      const periodKey = `${latestMainMeter.periodStart.getFullYear()}-${String(
        latestMainMeter.periodStart.getMonth() + 1
      ).padStart(2, "0")}`;
      const readings = await Reading.find({ organizationId, period: periodKey });
      if (readings.length > 0) {
        discrepancy = checkDiscrepancy(
          latestMainMeter.consumption,
          readings.map((r) => r.consumption)
        );
      }
    }

    return NextResponse.json({
      totalSubmeters,
      activeSubmeters,
      totalUsers,
      currentPeriodConsumption,
      currentPeriodAmount,
      unpaidInvoicesCount,
      unpaidAmount,
      discrepancy,
      latestMainMeter,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
