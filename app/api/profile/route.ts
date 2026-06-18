import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateProfileSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const user = await User.findById(session.user.id).populate(
      "submeterId",
      "code label"
    );
    if (!user) {
      throw new ApiError("Utilisateur introuvable", 404);
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const user = await User.findById(session.user.id);
    if (!user) {
      throw new ApiError("Utilisateur introuvable", 404);
    }

    if (data.email && data.email.toLowerCase() !== user.email) {
      const existing = await User.findOne({
        email: data.email.toLowerCase(),
      });
      if (existing) {
        throw new ApiError("Cet email est déjà utilisé", 409);
      }
      data.email = data.email.toLowerCase();
    }

    Object.assign(user, data);
    await user.save();

    const userResponse = user.toObject() as unknown as Record<string, unknown>;
    delete userResponse.password;

    return NextResponse.json({ user: userResponse });
  } catch (error) {
    return handleApiError(error);
  }
}
