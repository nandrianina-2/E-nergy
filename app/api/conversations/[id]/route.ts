import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation } from "@/lib/models";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";

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

    if (
      session.user.role !== "admin" &&
      conversation.userId._id?.toString() !== session.user.id
    ) {
      throw new ApiError("Accès refusé à cette conversation", 403);
    }

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

    if (
      session.user.role !== "admin" &&
      conversation.userId.toString() !== session.user.id
    ) {
      throw new ApiError("Accès refusé", 403);
    }

    const body = await req.json();
    if (body.status) {
      if (session.user.role !== "admin") {
        throw new ApiError("Seul l'admin peut fermer une conversation", 403);
      }
      conversation.status = body.status;
      await conversation.save();
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    return handleApiError(error);
  }
}
