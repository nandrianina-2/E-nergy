import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import { requireAuth, assertOrgAccess, handleApiError, ApiError } from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    const conversation = await Conversation.findById(id);
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

    // Marque comme lus les messages envoyés par "l'autre partie"
    const otherRole = isStaff ? "user" : "admin";

    await Message.updateMany(
      { conversationId: id, senderRole: otherRole, isRead: false },
      { isRead: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
