import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import { requireAuth, assertOrgAccess, handleApiError, ApiError } from "@/lib/api-helpers";
import { sendMessageSchema } from "@/lib/validations";
import { createNotification, notifyAllAdmins } from "@/lib/services/notifications";

interface Params {
  params: Promise<{ id: string }>;
}

async function assertConversationAccess(
  session: { user: { role: string; id: string; organizationId?: string | null } },
  conversationId: string
) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError("Conversation introuvable", 404);
  }
  const isStaff = session.user.role === "admin" || session.user.role === "super_admin";
  if (!isStaff && conversation.userId.toString() !== session.user.id) {
    throw new ApiError("Accès refusé à cette conversation", 403);
  }
  if (session.user.role === "admin") {
    assertOrgAccess(session, conversation.organizationId.toString(), "Conversation introuvable");
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
      senderRole: session.user.role === "super_admin" ? "admin" : session.user.role,
      text: data.text,
      imageUrl: data.imageUrl,
    });

    conversation.lastMessageAt = new Date();
    if (conversation.status === "closed") {
      conversation.status = "open";
    }
    await conversation.save();

    // Notifie l'autre partie. Le super_admin est traité comme l'admin de
    // l'organisation pour cette logique (il agit en tant que staff côté chat).
    const isStaffSender =
      session.user.role === "admin" || session.user.role === "super_admin";

    if (isStaffSender) {
      await createNotification({
        userId: conversation.userId.toString(),
        type: "new_message",
        title: "Nouvelle réponse de l'administrateur",
        message: data.text
          ? data.text.slice(0, 100)
          : "Nouvelle image envoyée",
        link: `/user/conversations/${conversation._id}`,
      });
    } else {
      await notifyAllAdmins({
        type: "new_message",
        title: "Nouveau message dans une discussion",
        message: data.text
          ? data.text.slice(0, 100)
          : `Nouvelle image envoyée par ${session.user.name}`,
        link: `/admin/conversations/${conversation._id}`,
        organizationId: conversation.organizationId.toString(),
      });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
