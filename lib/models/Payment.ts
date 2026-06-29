import mongoose, { Schema, Model, models } from "mongoose";

export interface PaymentDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  submeterId: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  method: "cash" | "transfer" | "mobile_money" | "other";
  note?: string;
  recordedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    submeterId: {
      type: Schema.Types.ObjectId,
      ref: "Submeter",
      required: true,
    },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ["cash", "transfer", "mobile_money", "other"],
      default: "cash",
    },
    note: { type: String },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentSchema.index({ organizationId: 1, invoiceId: 1 });
PaymentSchema.index({ organizationId: 1, submeterId: 1 });

export const Payment: Model<PaymentDocument> =
  (models.Payment as Model<PaymentDocument>) ||
  mongoose.model<PaymentDocument>("Payment", PaymentSchema);
