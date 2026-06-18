import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth, handleApiError } from "@/lib/api-helpers";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST() {
  try {
    await requireAuth();

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "e-nergy/avatars";

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
