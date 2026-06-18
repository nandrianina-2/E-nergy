import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError, ApiError } from "@/lib/api-helpers";
import { extractInvoiceData } from "@/lib/services/ocr";

export const maxDuration = 60; // l'OCR peut prendre du temps

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new ApiError("Aucun fichier fourni", 400);
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new ApiError(
        "Format non supporté pour l'extraction OCR. Utilisez une image (PNG, JPG, WEBP). Pour un PDF, convertissez-le d'abord en image.",
        400
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extracted = await extractInvoiceData(buffer);

    return NextResponse.json({ extracted });
  } catch (error) {
    return handleApiError(error);
  }
}
