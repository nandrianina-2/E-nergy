import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";
import { sendMessageSchema } from "@/lib/validations";
import { createNotification, notifyAllAdmins } from "@/lib/services/notifications";

interface Params {
  params: Promise<{ id: string }>;
}

async function assertConversationAccess(
  session: { user: { role: string; id: string } },
  conversationId: string
) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError("Conversation introuvable", 404);
  }
  if (
    session.user.role !== "admin" &&
    conversation.userId.toString() !== session.user.id
  ) {
    throw new ApiError("Accès refusé à cette conversation", 403);
  }
  return conversation;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    await assertConversationAccess(session, id);

    const messages = await Message.find({ conversationId: id })
      .populate("senderId", "name avatarUrl")
      .sort({ createdAt: 1 });

    return NextResponse.json({ messages });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    const conversation = await assertConversationAccess(session, id);

    const body = await req.json();
    const data = sendMessageSchema.parse(body);

    const message = await Message.create({
      conversationId: id,
      senderId: session.user.id,
      senderRole: session.user.role,
      text: data.text,
      imageUrl: data.imageUrl,
    });

    conversation.lastMessageAt = new Date();
    if (conversation.status === "closed") {
      conversation.status = "open";
    }
    await conversation.save();

    // Notifie l'autre partie
    if (session.user.role === "admin") {
      await createNotification({
        userId: conversation.userId.toString(),
        type: "general",
        title: "Nouvelle réponse de l'administrateur",
        message: data.text
          ? data.text.slice(0, 100)
          : "Nouvelle image envoyée",
        link: `/user/conversations/${conversation._id}`,
      });
    } else {
      await notifyAllAdmins({
        type: "general",
        title: "Nouveau message dans une discussion",
        message: data.text
          ? data.text.slice(0, 100)
          : `Nouvelle image envoyée par ${session.user.name}`,
        link: `/admin/conversations/${conversation._id}`,
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
