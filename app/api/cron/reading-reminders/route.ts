import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Submeter, Reading, Organization } from "@/lib/models";
import { requireCronSecretOrAdmin, handleApiError } from "@/lib/api-helpers";
import { createNotification } from "@/lib/services/notifications";
import { readingReminderEmailTemplate } from "@/lib/services/email";
import { getCurrentPeriod, formatPeriod } from "@/lib/utils";

export const maxDuration = 60;

// Jour du mois à partir duquel le rappel se déclenche (inclus)
const REMINDER_DAY_OF_MONTH = 25;

export async function GET(req: Request) {
  try {
    await requireCronSecretOrAdmin(req);
    await connectDB();

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const now = new Date();
    const dayOfMonth = now.getDate();

    if (!force && dayOfMonth < REMINDER_DAY_OF_MONTH) {
      return NextResponse.json({
        skipped: true,
        reason: `En attente du ${REMINDER_DAY_OF_MONTH} du mois (aujourd'hui : ${dayOfMonth})`,
      });
    }

    const currentPeriod = getCurrentPeriod();

    // Seules les organisations avec un abonnement actif/en essai reçoivent
    // des rappels automatiques — pas celles suspendues ou expirées.
    const activeOrgs = await Organization.find({
      isActive: true,
      subscriptionStatus: { $in: ["active", "trial"] },
    }).select("_id");
    const activeOrgIds = activeOrgs.map((o) => o._id);

    const submeters = await Submeter.find({
      organizationId: { $in: activeOrgIds },
      isActive: true,
      userId: { $exists: true, $ne: null },
      lastReadingReminderPeriod: { $ne: currentPeriod },
    }).populate("userId", "name email");

    let remindersSent = 0;
    const errors: string[] = [];

    for (const submeter of submeters) {
      try {
        const existingReading = await Reading.findOne({
          submeterId: submeter._id,
          period: currentPeriod,
        });

        if (existingReading) {
          // Déjà saisi : on marque quand même la période comme "traitée" pour
          // ne pas réévaluer ce sous-compteur inutilement les jours suivants.
          submeter.lastReadingReminderPeriod = currentPeriod;
          await submeter.save();
          continue;
        }

        const user = submeter.userId as unknown as {
          _id: string;
          name: string;
          email: string;
        };

        await createNotification({
          userId: user._id.toString(),
          type: "reading_reminder",
          title: "Rappel : relevé mensuel à saisir",
          message: `N'oubliez pas de saisir votre relevé pour ${formatPeriod(
            currentPeriod
          )} avant la fin du mois.`,
          link: "/user/readings",
          sendEmailToo: true,
          emailHtml: readingReminderEmailTemplate({
            userName: user.name,
            period: formatPeriod(currentPeriod),
          }),
        });

        submeter.lastReadingReminderPeriod = currentPeriod;
        await submeter.save();
        remindersSent++;
      } catch (err) {
        errors.push(
          `Sous-compteur ${submeter.code} : ${
            err instanceof Error ? err.message : "erreur inconnue"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      period: currentPeriod,
      submetersChecked: submeters.length,
      remindersSent,
      errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
