import { connectDB } from "@/lib/db";
import { Notification, User } from "@/lib/models";
import { sendEmail } from "@/lib/services/email";
import { NotificationType } from "@/types";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  sendEmailToo?: boolean;
  emailHtml?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  await connectDB();

  const notification = await Notification.create({
    userId: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
  });

  if (params.sendEmailToo) {
    const user = await User.findById(params.userId);
    if (user?.email) {
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
  }

  return notification;
}

export async function notifyAllAdmins(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  await connectDB();
  const admins = await User.find({ role: "admin", isActive: true });

  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin._id.toString(),
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      })
    )
  );
}
