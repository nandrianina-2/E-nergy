import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User, Submeter } from "@/lib/models";
import { requireOrgScopeStrict, handleApiError, ApiError } from "@/lib/api-helpers";
import { updateUserSchema } from "@/lib/validations";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();
    const { id } = await params;

    const user = await User.findOne({ _id: id, organizationId }).populate(
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

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();
    const { id } = await params;

    const body = await req.json();
    const data = updateUserSchema.parse(body);

    // Un admin ne peut jamais modifier le rôle ou l'organisation d'un compte
    // via cette route — ce levier est réservé au super-admin, pour éviter
    // qu'un admin ne s'auto-promeuve ou ne transfère un utilisateur ailleurs.
    delete (data as Record<string, unknown>).role;
    delete (data as Record<string, unknown>).organizationId;

    const user = await User.findOne({ _id: id, organizationId, role: "user" });
    if (!user) {
      throw new ApiError("Utilisateur introuvable", 404);
    }

    // Gestion du changement de sous-compteur assigné
    if (data.submeterId !== undefined) {
      // Libère l'ancien sous-compteur s'il y en avait un
      if (user.submeterId) {
        await Submeter.findByIdAndUpdate(user.submeterId, {
          $unset: { userId: "" },
        });
      }
      // Assigne le nouveau
      if (data.submeterId) {
        const newSubmeter = await Submeter.findOne({
          _id: data.submeterId,
          organizationId,
        });
        if (!newSubmeter) {
          throw new ApiError("Sous-compteur introuvable", 404);
        }
        if (
          newSubmeter.userId &&
          newSubmeter.userId.toString() !== id
        ) {
          throw new ApiError(
            "Ce sous-compteur est déjà assigné à un autre utilisateur",
            409
          );
        }
        await Submeter.findByIdAndUpdate(data.submeterId, { userId: id });
      }
    }

    if (data.email) {
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

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();
    const { id } = await params;

    const user = await User.findOne({ _id: id, organizationId, role: "user" });
    if (!user) {
      throw new ApiError("Utilisateur introuvable", 404);
    }

    if (user.submeterId) {
      await Submeter.findByIdAndUpdate(user.submeterId, {
        $unset: { userId: "" },
      });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
