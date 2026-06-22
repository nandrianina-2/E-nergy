import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";

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
    if (
      session.user.role !== "admin" &&
      conversation.userId.toString() !== session.user.id
    ) {
      throw new ApiError("Accès refusé à cette conversation", 403);
    }

    // Marque comme lus les messages envoyés par "l'autre partie"
    const otherRole = session.user.role === "admin" ? "user" : "admin";

    await Message.updateMany(
      { conversationId: id, senderRole: otherRole, isRead: false },
      { isRead: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
