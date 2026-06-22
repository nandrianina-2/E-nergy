import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteSettings } from "@/lib/models";
import { requireAdmin, requireAuth, handleApiError } from "@/lib/api-helpers";
import { updateSiteSettingsSchema } from "@/lib/validations";

async function getOrCreateSettings() {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({ siteName: "E-nergy" });
  }
  return settings;
}

export async function GET() {
  try {
    // Visible par tout utilisateur connecté (nécessaire pour afficher le logo/nom partout)
    await requireAuth();
    await connectDB();

    const settings = await getOrCreateSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await req.json();
    const data = updateSiteSettingsSchema.parse(body);

    const settings = await getOrCreateSettings();
    Object.assign(settings, data);
    await settings.save();

    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
