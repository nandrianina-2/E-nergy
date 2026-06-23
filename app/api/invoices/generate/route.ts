import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MainMeter, Reading, Invoice, Submeter } from "@/lib/models";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api-helpers";
import { generateInvoicesSchema } from "@/lib/validations";
import { allocateCosts, checkDiscrepancy } from "@/lib/services/allocation";
import { generateInvoiceNumber } from "@/lib/utils";
import {
  createNotification,
  notifyAllAdmins,
} from "@/lib/services/notifications";
import { newInvoiceEmailTemplate, discrepancyAlertEmailTemplate } from "@/lib/services/email";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await req.json();
    const { mainMeterId } = generateInvoicesSchema.parse(body);

    const mainMeter = await MainMeter.findById(mainMeterId);
    if (!mainMeter) {
      throw new ApiError("Facture principale introuvable", 404);
    }

    if (mainMeter.status === "allocated") {
      throw new ApiError(
        "Les factures pour cette période ont déjà été générées",
        409
      );
    }

    const periodKey = `${mainMeter.periodStart.getFullYear()}-${String(
      mainMeter.periodStart.getMonth() + 1
    ).padStart(2, "0")}`;

    const readings = await Reading.find({ period: periodKey }).populate(
      "submeterId"
    );

    if (readings.length === 0) {
      throw new ApiError(
        "Aucun relevé n'a été saisi pour cette période. Impossible de générer les factures.",
        400
      );
    }

    // Vérification d'écart avant répartition
    const discrepancy = checkDiscrepancy(
      mainMeter.consumption,
      readings.map((r) => r.consumption)
    );

    const allocations = allocateCosts({
      method: mainMeter.allocationMethod,
      mainMeterConsumption: mainMeter.consumption,
      mainMeterAmount: mainMeter.amount,
      mainMeterTaxAmount: mainMeter.taxAmount,
      mainMeterTotalAmount: mainMeter.totalAmount,
      submeters: readings.map((r) => ({
        submeterId: r.submeterId._id.toString(),
        consumption: r.consumption,
      })),
    });

    const createdInvoices = [];

    for (const allocation of allocations) {
      const reading = readings.find(
        (r) => r.submeterId._id.toString() === allocation.submeterId
      )!;
      const submeter = reading.submeterId as unknown as {
        _id: string;
        userId?: string;
        label: string;
        code: string;
      };

      const invoiceNumber = generateInvoiceNumber("INV");

      const invoice = await Invoice.create({
        invoiceNumber,
        submeterId: allocation.submeterId,
        readingId: reading._id,
        mainMeterId: mainMeter._id,
        period: periodKey,
        consumption: allocation.consumption,
        unitPrice: allocation.unitPrice,
        amount: allocation.amount,
        taxAmount: allocation.taxAmount,
        totalAmount: allocation.totalAmount,
        dueDate: mainMeter.dueDate,
        paymentStatus: "unpaid",
        amountPaid: 0,
      });

      createdInvoices.push(invoice);

      // Notifie l'utilisateur du sous-compteur s'il existe
      if (submeter.userId) {
        await createNotification({
          userId: submeter.userId.toString(),
          type: "new_invoice",
          title: "Nouvelle facture disponible",
          message: `Votre facture pour la période ${formatPeriod(
            periodKey
          )} d'un montant de ${formatCurrency(
            allocation.totalAmount
          )} est disponible.`,
          link: "/user/invoices",
          sendEmailToo: true,
          emailHtml: newInvoiceEmailTemplate({
            userName: submeter.label,
            invoiceNumber,
            period: formatPeriod(periodKey),
            totalAmount: formatCurrency(allocation.totalAmount),
            dueDate: formatDate(mainMeter.dueDate),
          }),
        });
      }
    }

    mainMeter.status = "allocated";
    await mainMeter.save();

    if (!discrepancy.isWithinTolerance) {
      await notifyAllAdmins({
        type: "discrepancy_alert",
        title: "Écart de consommation lors de la génération",
        message: `Écart de ${discrepancy.differencePercent.toFixed(
          1
        )}% détecté entre le compteur principal et la somme des sous-compteurs pour la période ${formatPeriod(
          periodKey
        )}.`,
        link: "/admin/statistics",
        sendEmailToo: true,
        emailHtml: discrepancyAlertEmailTemplate({
          mainMeterConsumption: discrepancy.mainMeterConsumption,
          submetersTotal: discrepancy.submetersTotalConsumption,
          differencePercent: discrepancy.differencePercent,
        }),
      });
    }

    return NextResponse.json({
      invoices: createdInvoices,
      discrepancy,
      count: createdInvoices.length,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
