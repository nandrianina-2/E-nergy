import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import {
  requireAdmin,
  requireAuth,
  assertOrgAccess,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    const conversation = await Conversation.findById(id)
      .populate("userId", "name email avatarUrl")
      .populate("invoiceId", "invoiceNumber period");

    if (!conversation) {
      throw new ApiError("Conversation introuvable", 404);
    }

    const isStaff = session.user.role === "admin" || session.user.role === "super_admin";

    if (!isStaff && conversation.userId._id?.toString() !== session.user.id) {
      throw new ApiError("Accès refusé à cette conversation", 403);
    }

    assertOrgAccess(session, conversation.organizationId.toString(), "Conversation introuvable");

    return NextResponse.json({ conversation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new ApiError("Conversation introuvable", 404);
    }

    const isStaff = session.user.role === "admin" || session.user.role === "super_admin";
    const isOwner = conversation.userId.toString() === session.user.id;

    if (!isStaff && !isOwner) {
      throw new ApiError("Accès refusé", 403);
    }
    if (isStaff && session.user.role === "admin") {
      assertOrgAccess(session, conversation.organizationId.toString(), "Conversation introuvable");
    }

    const body = await req.json();

    if (body.status !== undefined) {
      if (!isStaff) {
        throw new ApiError(
          "Seul l'admin peut ouvrir ou fermer une conversation",
          403
        );
      }
      conversation.status = body.status;
    }

    if (body.archivedByUser !== undefined) {
      // L'archivage est une préférence personnelle : seul le propriétaire
      // de la conversation (ou l'admin pour dépannage) peut la modifier.
      if (!isStaff && !isOwner) {
        throw new ApiError("Accès refusé", 403);
      }
      conversation.archivedByUser = !!body.archivedByUser;
    }

    await conversation.save();

    return NextResponse.json({ conversation });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    // Suppression définitive réservée à l'admin (les utilisateurs archivent,
    // ils ne suppriment pas, pour préserver l'historique en cas de litige
    // sur un paiement).
    const session = await requireAdmin();
    await connectDB();
    const { id } = await params;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      throw new ApiError("Conversation introuvable", 404);
    }

    assertOrgAccess(session, conversation.organizationId.toString(), "Conversation introuvable");

    await Message.deleteMany({ conversationId: id });
    await Conversation.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
