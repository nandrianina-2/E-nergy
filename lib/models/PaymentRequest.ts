import mongoose, { Schema, Model, models } from "mongoose";

export interface PaymentRequestDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  submeterId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  method: "mvola" | "orange_money" | "airtel_money" | "cash";
  status: "pending" | "approved" | "rejected";
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRequestSchema = new Schema<PaymentRequestDocument>(
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
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ["mvola", "orange_money", "airtel_money", "cash"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

PaymentRequestSchema.index({ organizationId: 1, status: 1 });
PaymentRequestSchema.index({ invoiceId: 1 });
PaymentRequestSchema.index({ userId: 1 });

export const PaymentRequest: Model<PaymentRequestDocument> =
  (models.PaymentRequest as Model<PaymentRequestDocument>) ||
  mongoose.model<PaymentRequestDocument>(
    "PaymentRequest",
    PaymentRequestSchema
  );
