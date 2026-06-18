import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, Submeter } from "@/lib/models";
import { requireAdmin, handleApiError } from "@/lib/api-helpers";
import { createUserSchema } from "@/lib/validations";
import { createNotification } from "@/lib/services/notifications";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) {
      query.role = role;
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate("submeterId", "code label")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

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
    await requireAdmin();
    await connectDB();

    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 409 }
      );
    }

    if (data.submeterId) {
      const submeter = await Submeter.findById(data.submeterId);
      if (!submeter) {
        return NextResponse.json(
          { error: "Sous-compteur introuvable" },
          { status: 404 }
        );
      }
      if (submeter.userId) {
        return NextResponse.json(
          { error: "Ce sous-compteur est déjà assigné à un autre utilisateur" },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      ...data,
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
    });

    const userResponse = user.toObject() as unknown as Record<string, unknown>;
    delete userResponse.password;

    return NextResponse.json({ user: userResponse }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
