import mongoose, { Schema, Model, models } from "mongoose";

export type SubscriptionStatus = "active" | "trial" | "suspended" | "expired";

export interface OrganizationDocument extends mongoose.Document {
  name: string; // ex: "Immeuble Andohatapenaka", "Résidence Ambohipo"
  ownerId: mongoose.Types.ObjectId; // l'admin propriétaire de cette organisation
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: Date;
  monthlyFee: number; // montant de l'abonnement mensuel (Ar)
  notes?: string; // notes internes du super-admin (ex: "paiement reçu par MVola le 5")
  isActive: boolean; // désactivation complète, distincte du statut d'abonnement
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<OrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionStatus: {
      type: String,
      enum: ["active", "trial", "suspended", "expired"],
      default: "trial",
    },
    subscriptionExpiresAt: { type: Date },
    monthlyFee: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ subscriptionStatus: 1 });

export const Organization: Model<OrganizationDocument> =
  (models.Organization as Model<OrganizationDocument>) ||
  mongoose.model<OrganizationDocument>("Organization", OrganizationSchema);
