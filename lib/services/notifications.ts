import { connectDB } from "@/lib/db";
import { Notification, User } from "@/lib/models";
import { sendEmail } from "@/lib/services/email";
import { NotificationType, NotificationChannelPrefs } from "@/types";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  sendEmailToo?: boolean;
  emailHtml?: string;
}

// Types toujours actifs, non désactivables par l'utilisateur : sécurité du
// compte (bienvenue) et alerte technique critique (écart de consommation
// anormal, potentiellement signe d'une fuite ou d'un vol d'électricité).
const NON_CONFIGURABLE_TYPES: NotificationType[] = [
  "account_created",
  "discrepancy_alert",
];

const DEFAULT_CHANNEL_PREFS: NotificationChannelPrefs = {
  inApp: true,
  email: true,
};

function getChannelPrefs(
  type: NotificationType,
  preferences?: Record<string, { inApp: boolean; email: boolean }> | Map<string, { inApp: boolean; email: boolean }>
): NotificationChannelPrefs {
  if (NON_CONFIGURABLE_TYPES.includes(type)) {
    return DEFAULT_CHANNEL_PREFS;
  }
  if (!preferences) return DEFAULT_CHANNEL_PREFS;

  // Mongoose stocke les Map en mémoire comme de vraies Map, mais après un
  // .lean() ou une sérialisation JSON elles deviennent des objets simples.
  const prefsForType =
    preferences instanceof Map ? preferences.get(type) : preferences[type];

  return prefsForType || DEFAULT_CHANNEL_PREFS;
}

export async function createNotification(params: CreateNotificationParams) {
  await connectDB();

  const user = await User.findById(params.userId).select(
    "email notificationPreferences"
  );

  const prefs = getChannelPrefs(params.type, user?.notificationPreferences);

  let notification = null;

  if (prefs.inApp) {
    notification = await Notification.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
    });
  }

  if (params.sendEmailToo && prefs.email && user?.email) {
    try {
      await sendEmail({
        to: user.email,
        subject: params.title,
        html: params.emailHtml || `<p>${params.message}</p>`,
      });
    } catch (err) {
      console.error("[notifications] Échec envoi email :", err);
    }
  }

  return notification;
}

export async function notifyAllAdmins(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  sendEmailToo?: boolean;
  emailHtml?: string;
  /** Organisation dont les admins doivent être notifiés. Obligatoire pour
   * éviter qu'une notification destinée à un admin fuite vers tous les
   * admins de toutes les organisations. */
  organizationId: string;
}) {
  await connectDB();
  const admins = await User.find({
    role: "admin",
    organizationId: params.organizationId,
    isActive: true,
  });

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id.toString(),
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        sendEmailToo: params.sendEmailToo,
        emailHtml: params.emailHtml,
      })
    )
  );
}

/**
 * Notifie uniquement le super_admin (supervision globale), par exemple pour
 * des événements transversaux comme un nouvel abonnement à valider.
 */
export async function notifySuperAdmins(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  sendEmailToo?: boolean;
  emailHtml?: string;
}) {
  await connectDB();
  const superAdmins = await User.find({ role: "super_admin", isActive: true });

  await Promise.all(
    superAdmins.map((sa) =>
      createNotification({
        userId: sa._id.toString(),
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        sendEmailToo: params.sendEmailToo,
        emailHtml: params.emailHtml,
      })
    )
  );
}
