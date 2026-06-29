import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation, Message, Invoice, User } from "@/lib/models";
import {
  requireAuth,
  assertSubmeterAccess,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";
import { createConversationSchema } from "@/lib/validations";
import { notifyAllAdmins, createNotification } from "@/lib/services/notifications";
import { newMessageEmailTemplate } from "@/lib/services/email";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const includeArchived = searchParams.get("includeArchived") === "true";

    const query: Record<string, unknown> = {};

    if (session.user.role === "user") {
      query.userId = session.user.id;
      if (!includeArchived) {
        query.archivedByUser = { $ne: true };
      }
    } else if (session.user.role === "admin") {
      if (!session.user.organizationId) {
        return NextResponse.json({
          conversations: [],
          pagination: { total: 0, page: 1, limit, totalPages: 0 },
        });
      }
      query.organizationId = session.user.organizationId;
    } else if (session.user.role === "super_admin") {
      const requestedOrgId = searchParams.get("organizationId");
      if (requestedOrgId) query.organizationId = requestedOrgId;
    }

    const total = await Conversation.countDocuments(query);
    const conversations = await Conversation.find(query)
      .populate("userId", "name email avatarUrl")
      .populate("invoiceId", "invoiceNumber period")
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Compte les messages non lus par conversation (du point de vue du rôle courant)
    const isStaff = session.user.role === "admin" || session.user.role === "super_admin";
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversations.map((c) => c._id) },
          isRead: false,
          senderRole: isStaff ? "user" : "admin",
        },
      },
      { $group: { _id: "$conversationId", count: { $sum: 1 } } },
    ]);

    const unreadMap = new Map(
      unreadCounts.map((u) => [u._id.toString(), u.count])
    );

    const conversationsWithUnread = conversations.map((c) => ({
      ...c.toObject(),
      unreadCount: unreadMap.get(c._id.toString()) || 0,
    }));

    return NextResponse.json({
      conversations: conversationsWithUnread,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const isStaff = session.user.role === "admin" || session.user.role === "super_admin";

    // Détermine l'organisation cible : pour un admin, toujours la sienne ;
    // pour le super_admin, déduite de l'utilisateur/facture ciblé.
    let organizationId: string | null =
      session.user.role !== "super_admin" ? session.user.organizationId || null : null;

    const body = await req.json();
    const data = createConversationSchema.parse(body);

    // Si une facture est précisée, on récupère le sous-compteur/utilisateur propriétaire
    let invoice = null;
    if (data.invoiceId) {
      const invoiceQuery: Record<string, unknown> = { _id: data.invoiceId };
      if (organizationId) invoiceQuery.organizationId = organizationId;

      invoice = await Invoice.findOne(invoiceQuery).populate("submeterId", "userId");
      if (!invoice) {
        throw new ApiError("Facture introuvable", 404);
      }
      if (!organizationId) organizationId = invoice.organizationId.toString();
    }

    // Détermine l'utilisateur cible de la conversation
    let targetUserId = session.user.id;
    if (isStaff) {
      if (invoice) {
        // L'utilisateur cible est déduit automatiquement du sous-compteur de la facture
        const submeter = invoice.submeterId as unknown as { userId?: string };
        if (!submeter.userId) {
          throw new ApiError(
            "Cette facture n'est associée à aucun utilisateur",
            400
          );
        }
        targetUserId = submeter.userId.toString();
      } else if (data.userId) {
        const userQuery: Record<string, unknown> = { _id: data.userId };
        if (organizationId) userQuery.organizationId = organizationId;

        const targetUser = await User.findOne(userQuery);
        if (!targetUser) {
          throw new ApiError("Utilisateur introuvable", 404);
        }
        if (!organizationId && targetUser.organizationId) {
          organizationId = targetUser.organizationId.toString();
        }
        targetUserId = data.userId;
      } else {
        throw new ApiError(
          "Vous devez sélectionner un utilisateur ou une facture pour créer une discussion",
          400
        );
      }
    } else if (invoice) {
      assertSubmeterAccess(session, invoice.submeterId._id.toString());
    }

    if (!organizationId) {
      throw new ApiError(
        "Impossible de déterminer l'organisation cible de cette discussion",
        400
      );
    }

    if (invoice) {
      // Une seule conversation ouverte par facture
      const existing = await Conversation.findOne({
        invoiceId: data.invoiceId,
        status: "open",
      });
      if (existing) {
        return NextResponse.json({ conversation: existing }, { status: 200 });
      }
    }

    const conversation = await Conversation.create({
      organizationId,
      userId: targetUserId,
      invoiceId: data.invoiceId,
      subject: data.subject,
      lastMessageAt: new Date(),
    });

    if (data.text || data.imageUrl) {
      await Message.create({
        conversationId: conversation._id,
        senderId: session.user.id,
        senderRole: isStaff ? "admin" : "user",
        text: data.text,
        imageUrl: data.imageUrl,
      });
    }

    if (isStaff) {
      const targetUser = await User.findById(targetUserId).select("name");
      await createNotification({
        userId: targetUserId,
        type: "new_message",
        title: "Nouvelle discussion de l'administrateur",
        message: `L'administrateur a ouvert une discussion : "${data.subject}".`,
        link: "/user/conversations",
        sendEmailToo: true,
        emailHtml: newMessageEmailTemplate({
          recipientName: targetUser?.name || "Utilisateur",
          senderName: session.user.name || "L'administrateur",
          subject: data.subject,
          messagePreview: data.text || "Nouvelle discussion ouverte",
          isAdminRecipient: false,
        }),
      });
    } else {
      await notifyAllAdmins({
        type: "new_message",
        title: "Nouvelle discussion ouverte",
        message: `${session.user.name} a ouvert une discussion : "${data.subject}".`,
        link: "/admin/conversations",
        organizationId,
      });
    }

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
