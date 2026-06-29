import mongoose, { Schema, Model, models } from "mongoose";

export interface InvoiceDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  submeterId: mongoose.Types.ObjectId;
  readingId: mongoose.Types.ObjectId;
  mainMeterId: mongoose.Types.ObjectId;
  period: string;
  consumption: number;
  unitPrice: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: Date;
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  pdfUrl?: string;
  lastReminderSentAt?: Date;
  reminderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<InvoiceDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    invoiceNumber: { type: String, required: true },
    submeterId: {
      type: Schema.Types.ObjectId,
      ref: "Submeter",
      required: true,
    },
    readingId: { type: Schema.Types.ObjectId, ref: "Reading", required: true },
    mainMeterId: {
      type: Schema.Types.ObjectId,
      ref: "MainMeter",
      required: true,
    },
    period: { type: String, required: true },
    consumption: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
    taxAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    amountPaid: { type: Number, default: 0 },
    pdfUrl: { type: String },
    lastReminderSentAt: { type: Date },
    reminderCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

InvoiceSchema.index({ organizationId: 1, submeterId: 1, period: 1 });
InvoiceSchema.index({ organizationId: 1, paymentStatus: 1 });
InvoiceSchema.index({ organizationId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ paymentStatus: 1, dueDate: 1, lastReminderSentAt: 1 });

export const Invoice: Model<InvoiceDocument> =
  (models.Invoice as Model<InvoiceDocument>) ||
  mongoose.model<InvoiceDocument>("Invoice", InvoiceSchema);
