import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateNotificationPreferencesSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectDB();

    const user = await User.findById(session.user.id).select(
      "notificationPreferences"
    );
    if (!user) {
      throw new ApiError("Utilisateur introuvable", 404);
    }

    // Conversion Map -> objet simple pour la sérialisation JSON
    const preferences = user.notificationPreferences
      ? Object.fromEntries(user.notificationPreferences as unknown as Map<string, unknown>)
      : {};

    return NextResponse.json({ preferences });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectDB();

    const body = await req.json();
    const data = updateNotificationPreferencesSchema.parse(body);

    const user = await User.findById(session.user.id);
    if (!user) {
      throw new ApiError("Utilisateur introuvable", 404);
    }

    user.notificationPreferences = data.preferences;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
