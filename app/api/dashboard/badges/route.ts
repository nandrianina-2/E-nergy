import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Notification, PaymentRequest, Conversation, Message } from "@/lib/models";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const unreadNotifications = await Notification.countDocuments({
      userId: session.user.id,
      isRead: false,
    });

    if (session.user.role === "admin" && session.user.organizationId) {
      const organizationId = session.user.organizationId;

      const pendingPaymentRequests = await PaymentRequest.countDocuments({
        organizationId,
        status: "pending",
      });

      // Conversations admin ayant au moins un message non lu envoyé par un utilisateur
      const conversations = await Conversation.find({ organizationId }).select("_id");
      const unreadConvCount = await Message.aggregate([
        {
          $match: {
            conversationId: { $in: conversations.map((c) => c._id) },
            isRead: false,
            senderRole: "user",
          },
        },
        { $group: { _id: "$conversationId" } },
        { $count: "total" },
      ]);

      return NextResponse.json({
        notifications: unreadNotifications,
        paymentRequests: pendingPaymentRequests,
        conversations: unreadConvCount[0]?.total || 0,
      });
    }

    if (session.user.role === "super_admin") {
      // Le super_admin n'a pas d'organisation : badges limités aux notifications
      // qui lui sont directement adressées.
      return NextResponse.json({ notifications: unreadNotifications, conversations: 0 });
    }

    // Côté utilisateur final : conversations avec message non lu envoyé par l'admin
    const userConversations = await Conversation.find({
      userId: session.user.id,
    }).select("_id");
    const unreadConvCount = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: userConversations.map((c) => c._id) },
          isRead: false,
          senderRole: "admin",
        },
      },
      { $group: { _id: "$conversationId" } },
      { $count: "total" },
    ]);

    return NextResponse.json({
      notifications: unreadNotifications,
      conversations: unreadConvCount[0]?.total || 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
