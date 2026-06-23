import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Invoice } from "@/lib/models";
import { requireCronSecretOrAdmin, handleApiError } from "@/lib/api-helpers";
import { createNotification, notifyAllAdmins } from "@/lib/services/notifications";
import { paymentReminderEmailTemplate } from "@/lib/services/email";
import { formatCurrency, formatDate } from "@/lib/utils";

export const maxDuration = 60;

const RELANCE_INTERVAL_DAYS = 7;

export async function GET(req: Request) {
  try {
    await requireCronSecretOrAdmin(req);
    await connectDB();

    const now = new Date();
    const relanceThreshold = new Date(
      now.getTime() - RELANCE_INTERVAL_DAYS * 24 * 60 * 60 * 1000
    );

    const overdueInvoices = await Invoice.find({
      paymentStatus: { $in: ["unpaid", "partial"] },
      dueDate: { $lt: now },
      $or: [
        { lastReminderSentAt: { $exists: false } },
        { lastReminderSentAt: { $lt: relanceThreshold } },
      ],
    })
      .populate({
        path: "submeterId",
        select: "code label userId",
        populate: { path: "userId", select: "name email" },
      })
      .limit(200); // garde-fou pour éviter une exécution trop longue sur de gros volumes

    let remindersSent = 0;
    const errors: string[] = [];

    for (const invoice of overdueInvoices) {
      try {
        const submeter = invoice.submeterId as unknown as {
          code: string;
          label: string;
          userId?: { _id: string; name: string; email: string };
        };

        if (!submeter.userId) {
          continue; // aucun utilisateur assigné, rien à notifier
        }

        const remainingAmount = invoice.totalAmount - invoice.amountPaid;
        const daysOverdue = Math.floor(
          (now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000)
        );

        await createNotification({
          userId: submeter.userId._id.toString(),
          type: "payment_overdue",
          title: "Rappel : facture en retard de paiement",
          message: `Votre facture ${
            invoice.invoiceNumber
          } d'un montant de ${formatCurrency(
            remainingAmount
          )} est en retard de ${daysOverdue} jour(s) (échéance : ${formatDate(
            invoice.dueDate
          )}).`,
          link: "/user/invoices",
          sendEmailToo: true,
          emailHtml: paymentReminderEmailTemplate({
            userName: submeter.userId.name,
            invoiceNumber: invoice.invoiceNumber,
            totalAmount: formatCurrency(remainingAmount),
            dueDate: formatDate(invoice.dueDate),
          }),
        });

        invoice.lastReminderSentAt = now;
        invoice.reminderCount = (invoice.reminderCount || 0) + 1;
        await invoice.save();
        remindersSent++;

        // Au-delà de 3 relances (3+ semaines de retard), on alerte aussi l'admin
        // une seule fois, pour signaler un cas de retard chronique nécessitant
        // potentiellement un contact direct plutôt qu'une relance automatique.
        if (invoice.reminderCount === 3) {
          await notifyAllAdmins({
            type: "payment_overdue",
            title: "Retard de paiement persistant",
            message: `La facture ${invoice.invoiceNumber} (${submeter.label}) est en retard depuis ${daysOverdue} jours malgré 3 relances automatiques.`,
            link: "/admin/invoices",
          });
        }
      } catch (err) {
        errors.push(
          `Facture ${invoice.invoiceNumber} : ${
            err instanceof Error ? err.message : "erreur inconnue"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      invoicesChecked: overdueInvoices.length,
      remindersSent,
      errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
