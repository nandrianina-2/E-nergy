import mongoose, { Schema, Model, models } from "mongoose";

export interface PaymentMethodDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  operator: "mvola" | "orange_money" | "airtel_money";
  label: string;
  transferCode: string; // ex: "034 12 345 67" (numéro marchand) ou code USSD complet
  ussdTemplate: string; // ex: "*111*1*{amount}*{code}#"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<PaymentMethodDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    operator: {
      type: String,
      enum: ["mvola", "orange_money", "airtel_money"],
      required: true,
    },
    label: { type: String, required: true },
    transferCode: { type: String, required: true },
    ussdTemplate: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Un seul enregistrement par opérateur ET par organisation (chaque admin a
// sa propre configuration MVola/Orange/Airtel, indépendante des autres).
PaymentMethodSchema.index({ organizationId: 1, operator: 1 }, { unique: true });

export const PaymentMethod: Model<PaymentMethodDocument> =
  (models.PaymentMethod as Model<PaymentMethodDocument>) ||
  mongoose.model<PaymentMethodDocument>("PaymentMethod", PaymentMethodSchema);
