import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, Submeter } from "@/lib/models";
import {
  requireOrgScopeStrict,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";
import { createUserSchema } from "@/lib/validations";
import { createNotification } from "@/lib/services/notifications";
import { accountCreatedEmailTemplate } from "@/lib/services/email";

export async function GET(req: NextRequest) {
  try {
    const { session, organizationId } = await requireOrgScopeStrict(req);
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    // Un admin ne voit que les utilisateurs de sa propre organisation, et
    // jamais les autres admins ni le super_admin. Le super_admin (via
    // organizationId explicite) peut filtrer une organisation précise.
    const query: Record<string, unknown> = {
      organizationId,
      role: role || "user",
    };
    if (session.user.role === "admin") {
      query.role = "user"; // un admin ne gère que ses propres locataires
    }

    // DEBUG TEMPORAIRE — à retirer après diagnostic
    console.log("[DEBUG /api/users] session.user.role =", session.user.role);
    console.log("[DEBUG /api/users] session.user.organizationId =", session.user.organizationId);
    console.log("[DEBUG /api/users] organizationId (scope) =", organizationId);
    console.log("[DEBUG /api/users] query finale =", JSON.stringify(query));

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate("submeterId", "code label")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // DEBUG TEMPORAIRE — à retirer après diagnostic
    console.log(
      "[DEBUG /api/users] résultats trouvés :",
      users.map((u) => ({ email: u.email, role: u.role, organizationId: u.organizationId }))
    );

    return NextResponse.json({
      users,
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
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();

    const body = await req.json();
    const data = createUserSchema.parse(body);

    // La création d'un compte admin (et de sa propre organisation) passe par
    // une route dédiée réservée au super_admin : /api/super-admin/organizations.
    // Cette route ne crée jamais que des utilisateurs finaux (locataires).
    if (data.role === "admin") {
      throw new ApiError(
        "La création d'un compte administrateur se fait via l'espace super-admin",
        403
      );
    }

    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new ApiError("Un utilisateur avec cet email existe déjà", 409);
    }

    if (data.submeterId) {
      const submeter = await Submeter.findOne({
        _id: data.submeterId,
        organizationId,
      });
      if (!submeter) {
        throw new ApiError("Sous-compteur introuvable", 404);
      }
      if (submeter.userId) {
        throw new ApiError(
          "Ce sous-compteur est déjà assigné à un autre utilisateur",
          409
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      ...data,
      role: "user",
      organizationId,
      email: data.email.toLowerCase(),
      password: hashedPassword,
    });

    if (data.submeterId) {
      await Submeter.findByIdAndUpdate(data.submeterId, { userId: user._id });
    }

    await createNotification({
      userId: user._id.toString(),
      type: "account_created",
      title: "Bienvenue sur E-nergy",
      message: `Votre compte a été créé avec succès. Vous pouvez maintenant suivre votre consommation électrique.`,
      sendEmailToo: true,
      emailHtml: accountCreatedEmailTemplate({ userName: user.name }),
    });

    const userResponse = user.toObject() as unknown as Record<string, unknown>;
    delete userResponse.password;

    return NextResponse.json({ user: userResponse }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
