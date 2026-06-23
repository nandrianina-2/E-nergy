import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Message, User } from "@/lib/models";
import { requireCronSecretOrAdmin, handleApiError } from "@/lib/api-helpers";
import { sendEmail, newMessageEmailTemplate } from "@/lib/services/email";

// Appelée fréquemment par un service externe (ex: cron-job.org, toutes les 30-60 min),
// car Vercel Cron sur le plan Hobby ne permet qu'une exécution par jour, trop lent
// pour respecter une fenêtre de 2h. Cette route est volontairement légère et idempotente :
// chaque appel ne traite que les messages jamais relancés, donc des appels rapprochés
// ou redondants ne provoquent aucun envoi en double.

export const maxDuration = 30;

const UNREAD_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 heures

export async function GET(req: Request) {
  try {
    await requireCronSecretOrAdmin(req);
    await connectDB();

    const threshold = new Date(Date.now() - UNREAD_THRESHOLD_MS);

    const staleMessages = await Message.find({
      isRead: false,
      reminderEmailSent: false,
      createdAt: { $lt: threshold },
    })
      .populate("senderId", "name")
      .populate({
        path: "conversationId",
        select: "userId subject",
      })
      .limit(300); // garde-fou

    if (staleMessages.length === 0) {
      return NextResponse.json({ success: true, remindersSent: 0, checked: 0 });
    }

    // Regroupe par destinataire : un admin qui a 5 messages en attente ne reçoit
    // qu'un seul email récapitulatif, pas 5.
    interface PendingForRecipient {
      recipientId: string;
      isAdminRecipient: boolean;
      items: { senderName: string; subject: string; preview: string }[];
      messageIds: string[];
    }
    const byRecipient = new Map<string, PendingForRecipient>();

    for (const msg of staleMessages) {
      const conversation = msg.conversationId as unknown as {
        _id: string;
        userId: { toString(): string };
        subject: string;
      } | null;
      if (!conversation) continue;

      // Le destinataire est l'autre partie : si le message vient de l'utilisateur,
      // le destinataire est l'admin (on regroupe sous une clé virtuelle "admin"),
      // sinon le destinataire est l'utilisateur propriétaire de la conversation.
      const isFromUser = msg.senderRole === "user";
      const recipientKey = isFromUser ? "admin" : conversation.userId.toString();

      if (!byRecipient.has(recipientKey)) {
        byRecipient.set(recipientKey, {
          recipientId: isFromUser ? "admin" : conversation.userId.toString(),
          isAdminRecipient: isFromUser,
          items: [],
          messageIds: [],
        });
      }

      const sender = msg.senderId as unknown as { name: string } | null;
      const entry = byRecipient.get(recipientKey)!;
      entry.items.push({
        senderName: sender?.name || "Quelqu'un",
        subject: conversation.subject,
        preview: msg.text ? msg.text.slice(0, 120) : "📷 Image envoyée",
      });
      entry.messageIds.push(msg._id.toString());
    }

    let remindersSent = 0;
    const errors: string[] = [];

    for (const [recipientKey, pending] of byRecipient) {
      try {
        if (pending.isAdminRecipient) {
          // Tous les admins actifs reçoivent le récapitulatif
          const admins = await User.find({ role: "admin", isActive: true });
          for (const admin of admins) {
            await sendEmail({
              to: admin.email,
              subject:
                pending.items.length > 1
                  ? `${pending.items.length} messages en attente de réponse`
                  : "Nouveau message en attente de réponse",
              html: newMessageEmailTemplate({
                recipientName: admin.name,
                senderName: pending.items[0].senderName,
                subject:
                  pending.items.length > 1
                    ? `${pending.items.length} discussions en attente`
                    : pending.items[0].subject,
                messagePreview: pending.items[0].preview,
                isAdminRecipient: true,
              }),
            });
          }
        } else {
          const user = await User.findById(pending.recipientId);
          if (!user) continue;
          await sendEmail({
            to: user.email,
            subject:
              pending.items.length > 1
                ? `${pending.items.length} messages en attente de réponse`
                : "Nouveau message en attente de réponse",
            html: newMessageEmailTemplate({
              recipientName: user.name,
              senderName: pending.items[0].senderName,
              subject:
                pending.items.length > 1
                  ? `${pending.items.length} discussions en attente`
                  : pending.items[0].subject,
              messagePreview: pending.items[0].preview,
              isAdminRecipient: false,
            }),
          });
        }

        // Marque tous les messages de ce lot comme relancés, qu'il y ait 1 ou
        // plusieurs admins destinataires — on ne veut relancer qu'une seule fois.
        await Message.updateMany(
          { _id: { $in: pending.messageIds } },
          { reminderEmailSent: true }
        );
        remindersSent += pending.messageIds.length;
      } catch (err) {
        errors.push(
          `Destinataire ${recipientKey} : ${
            err instanceof Error ? err.message : "erreur inconnue"
          }`
        );
      }
    }

    return NextResponse.json({
      success: true,
      checked: staleMessages.length,
      recipientsNotified: byRecipient.size,
      remindersSent,
      errors,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
