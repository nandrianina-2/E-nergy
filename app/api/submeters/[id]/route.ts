import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Submeter, Reading } from "@/lib/models";
import {
  requireAuth,
  requireOrgScopeStrict,
  assertSubmeterAccess,
  handleApiError,
  ApiError,
} from "@/lib/api-helpers";
import { updateSubmeterSchema } from "@/lib/validations";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    await connectDB();
    const { id } = await params;

    assertSubmeterAccess(session, id);

    const submeter = await Submeter.findById(id).populate(
      "userId",
      "name email phone"
    );
    if (!submeter) {
      throw new ApiError("Sous-compteur introuvable", 404);
    }

    // Vérifie que ce sous-compteur appartient bien à l'organisation de l'admin
    // (le super_admin, sans restriction, peut tout consulter).
    if (
      session.user.role === "admin" &&
      submeter.organizationId.toString() !== session.user.organizationId
    ) {
      throw new ApiError("Sous-compteur introuvable", 404);
    }

    return NextResponse.json({ submeter });
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
    const data = updateSubmeterSchema.parse(body);

    const submeter = await Submeter.findOne({ _id: id, organizationId });
    if (!submeter) {
      throw new ApiError("Sous-compteur introuvable", 404);
    }

    if (data.code && data.code !== submeter.code) {
      const existing = await Submeter.findOne({ organizationId, code: data.code });
      if (existing) {
        throw new ApiError("Un sous-compteur avec ce code existe déjà", 409);
      }
    }

    Object.assign(submeter, data);
    await submeter.save();

    return NextResponse.json({ submeter });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();
    const { id } = await params;

    const submeter = await Submeter.findOne({ _id: id, organizationId });
    if (!submeter) {
      throw new ApiError("Sous-compteur introuvable", 404);
    }

    const hasReadings = await Reading.exists({ submeterId: id });
    if (hasReadings) {
      throw new ApiError(
        "Impossible de supprimer ce sous-compteur : des relevés y sont associés. Désactivez-le plutôt.",
        409
      );
    }

    await Submeter.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
