import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";
import { changePasswordSchema } from "@/lib/validations";

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = await req.json();
    const data = changePasswordSchema.parse(body);

    const user = await User.findById(session.user.id).select("+password");
    if (!user) {
      throw new ApiError("Utilisateur introuvable", 404);
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.password);
    if (!isValid) {
      throw new ApiError("Mot de passe actuel incorrect", 400);
    }

    user.password = await bcrypt.hash(data.newPassword, 10);
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
