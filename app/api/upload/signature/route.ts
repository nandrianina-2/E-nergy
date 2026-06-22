import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth, handleApiError, ApiError } from "@/lib/api-helpers";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Liste blanche des dossiers autorisés, pour éviter qu'un client envoie un chemin arbitraire
const ALLOWED_FOLDERS = [
  "e-nergy/avatars",
  "e-nergy/chat",
  "e-nergy/site",
] as const;

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    let requestedFolder = "e-nergy/avatars";
    try {
      const body = await req.json();
      if (body?.folder) requestedFolder = body.folder;
    } catch {
      // Pas de body JSON fourni : on garde la valeur par défaut (rétrocompatible)
    }

    if (!ALLOWED_FOLDERS.includes(requestedFolder as any)) {
      throw new ApiError("Dossier de destination non autorisé", 400);
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = requestedFolder;

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET as string
    );

    return NextResponse.json({
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
