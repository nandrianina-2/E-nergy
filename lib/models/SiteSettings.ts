import mongoose, { Schema, Model, models } from "mongoose";

export interface SiteSettingsDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  siteName: string;
  logoUrl?: string;
  supportPhone?: string;
  supportEmail?: string;
  supportAddress?: string;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true, // un seul enregistrement de paramètres par organisation
    },
    siteName: { type: String, default: "E-nergy" },
    logoUrl: { type: String },
    supportPhone: { type: String },
    supportEmail: { type: String },
    supportAddress: { type: String },
  },
  { timestamps: true }
);

export const SiteSettings: Model<SiteSettingsDocument> =
  (models.SiteSettings as Model<SiteSettingsDocument>) ||
  mongoose.model<SiteSettingsDocument>("SiteSettings", SiteSettingsSchema);
