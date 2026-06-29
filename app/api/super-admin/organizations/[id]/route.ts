import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization, User, Submeter, Invoice, Payment } from "@/lib/models";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateOrganizationSchema } from "@/lib/validations";
import { createNotification } from "@/lib/services/notifications";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    await connectDB();
    const { id } = await params;

    const organization = await Organization.findById(id).populate(
      "ownerId",
      "name email phone isActive"
    );
    if (!organization) {
      throw new ApiError("Organisation introuvable", 404);
    }

    const [submetersCount, usersCount, totalInvoiced, totalPaid] = await Promise.all([
      Submeter.countDocuments({ organizationId: id }),
      User.countDocuments({ organizationId: id, role: "user" }),
      Invoice.aggregate([
        { $match: { organizationId: organization._id } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Payment.aggregate([
        { $match: { organizationId: organization._id } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    return NextResponse.json({
      organization,
      stats: {
        submetersCount,
        usersCount,
        totalInvoiced: totalInvoiced[0]?.total || 0,
        totalPaid: totalPaid[0]?.total || 0,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    await connectDB();
    const { id } = await params;

    const organization = await Organization.findById(id);
    if (!organization) {
      throw new ApiError("Organisation introuvable", 404);
    }

    const body = await req.json();
    const data = updateOrganizationSchema.parse(body);

    const previousStatus = organization.subscriptionStatus;

    Object.assign(organization, {
      ...data,
      subscriptionExpiresAt:
        data.subscriptionExpiresAt !== undefined
          ? data.subscriptionExpiresAt
            ? new Date(data.subscriptionExpiresAt)
            : undefined
          : organization.subscriptionExpiresAt,
    });
    await organization.save();

    // Notifie l'admin propriétaire en cas de changement de statut d'abonnement
    if (data.subscriptionStatus && data.subscriptionStatus !== previousStatus) {
      const statusLabels: Record<string, string> = {
        active: "activé",
        trial: "en période d'essai",
        suspended: "suspendu",
        expired: "expiré",
      };
      await createNotification({
        userId: organization.ownerId.toString(),
        type: "general",
        title: "Statut de votre abonnement modifié",
        message: `Votre abonnement E-nergy est maintenant ${statusLabels[data.subscriptionStatus]}.`,
        sendEmailToo: true,
      });
    }

    return NextResponse.json({ organization });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin();
    await connectDB();
    const { id } = await params;

    const organization = await Organization.findById(id);
    if (!organization) {
      throw new ApiError("Organisation introuvable", 404);
    }

    const hasData = await Submeter.exists({ organizationId: id });
    if (hasData) {
      throw new ApiError(
        "Impossible de supprimer une organisation contenant des sous-compteurs. Désactivez-la plutôt.",
        409
      );
    }

    await Organization.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
