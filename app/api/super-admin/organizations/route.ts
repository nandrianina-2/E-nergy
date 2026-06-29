import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { Organization, User, Submeter, Invoice } from "@/lib/models";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/api-helpers";
import { createOrganizationSchema } from "@/lib/validations";
import { createNotification } from "@/lib/services/notifications";
import { accountCreatedEmailTemplate } from "@/lib/services/email";

export async function GET() {
  try {
    await requireSuperAdmin();
    await connectDB();

    const organizations = await Organization.find()
      .populate("ownerId", "name email phone isActive")
      .sort({ createdAt: -1 });

    // Petites statistiques par organisation, utiles pour la vue de supervision
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const [submetersCount, usersCount, unpaidInvoicesCount] = await Promise.all([
          Submeter.countDocuments({ organizationId: org._id }),
          User.countDocuments({ organizationId: org._id, role: "user" }),
          Invoice.countDocuments({
            organizationId: org._id,
            paymentStatus: { $in: ["unpaid", "partial"] },
          }),
        ]);

        return {
          ...org.toObject(),
          submetersCount,
          usersCount,
          unpaidInvoicesCount,
        };
      })
    );

    return NextResponse.json({ organizations: organizationsWithStats });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin();
    await connectDB();

    const body = await req.json();
    const data = createOrganizationSchema.parse(body);

    const existingUser = await User.findOne({
      email: data.adminEmail.toLowerCase(),
    });
    if (existingUser) {
      throw new ApiError("Un utilisateur avec cet email existe déjà", 409);
    }

    // Pré-génère l'ID de l'organisation pour pouvoir l'attribuer à l'admin
    // dès sa création, puis créer l'organisation avec le bon ownerId d'emblée
    // (le schéma exige ownerId, donc on ne peut pas la créer "à blanc").
    const organizationId = new mongoose.Types.ObjectId();

    const hashedPassword = await bcrypt.hash(data.adminPassword, 10);

    const admin = await User.create({
      name: data.adminName,
      email: data.adminEmail.toLowerCase(),
      password: hashedPassword,
      phone: data.adminPhone,
      role: "admin",
      organizationId,
    });

    const organization = await Organization.create({
      _id: organizationId,
      name: data.organizationName,
      ownerId: admin._id,
      monthlyFee: data.monthlyFee,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionExpiresAt:
        data.subscriptionStatus === "active" || data.subscriptionStatus === "trial"
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 jours par défaut
          : undefined,
    });

    await createNotification({
      userId: admin._id.toString(),
      type: "account_created",
      title: "Bienvenue sur E-nergy",
      message: `Votre organisation "${organization.name}" a été créée. Vous pouvez maintenant gérer vos sous-compteurs et locataires.`,
      sendEmailToo: true,
      emailHtml: accountCreatedEmailTemplate({ userName: admin.name }),
    });

    const adminResponse = admin.toObject() as unknown as Record<string, unknown>;
    delete adminResponse.password;

    return NextResponse.json(
      { organization, admin: adminResponse },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
