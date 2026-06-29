import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SiteSettings } from "@/lib/models";
import { requireOrgScope, requireOrgScopeStrict, handleApiError } from "@/lib/api-helpers";
import { updateSiteSettingsSchema } from "@/lib/validations";

async function getOrCreateSettings(organizationId: string) {
  let settings = await SiteSettings.findOne({ organizationId });
  if (!settings) {
    settings = await SiteSettings.create({ organizationId, siteName: "E-nergy" });
  }
  return settings;
}

export async function GET(req: NextRequest) {
  try {
    // Visible par tout utilisateur connecté de l'organisation (nécessaire
    // pour afficher le logo/nom partout dans son espace).
    const { organizationId } = await requireOrgScope(req);
    if (!organizationId) {
      return NextResponse.json({ settings: { siteName: "E-nergy" } });
    }
    await connectDB();

    const settings = await getOrCreateSettings(organizationId);
    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { organizationId } = await requireOrgScopeStrict(req);
    await connectDB();

    const body = await req.json();
    const data = updateSiteSettingsSchema.parse(body);

    const settings = await getOrCreateSettings(organizationId);
    Object.assign(settings, data);
    await settings.save();

    return NextResponse.json({ settings });
  } catch (error) {
    return handleApiError(error);
  }
}
