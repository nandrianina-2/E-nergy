import mongoose, { Schema, Model, models } from "mongoose";

export interface SiteSettingsDocument extends mongoose.Document {
  siteName: string;
  logoUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    siteName: { type: String, default: "E-nergy" },
    logoUrl: { type: String },
    supportPhone: { type: String },
    supportEmail: { type: String },
  },
  { timestamps: true }
);

export const SiteSettings: Model<SiteSettingsDocument> =
  (models.SiteSettings as Model<SiteSettingsDocument>) ||
  mongoose.model<SiteSettingsDocument>("SiteSettings", SiteSettingsSchema);
