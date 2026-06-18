import mongoose, { Schema, Model, models } from "mongoose";

export interface MainMeterDocument extends mongoose.Document {
  invoiceNumber: string;
  oldIndex: number;
  newIndex: number;
  consumption: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  allocationMethod: "proportional" | "equal";
  fileUrl?: string;
  ocrRawText?: string;
  ocrConfidence?: number;
  status: "draft" | "validated" | "allocated";
  createdAt: Date;
  updatedAt: Date;
}

const MainMeterSchema = new Schema<MainMeterDocument>(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    oldIndex: { type: Number, required: true },
    newIndex: { type: Number, required: true },
    consumption: { type: Number, required: true },
    amount: { type: Number, required: true },
    taxAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    allocationMethod: {
      type: String,
      enum: ["proportional", "equal"],
      default: "proportional",
    },
    fileUrl: { type: String },
    ocrRawText: { type: String },
    ocrConfidence: { type: Number },
    status: {
      type: String,
      enum: ["draft", "validated", "allocated"],
      default: "draft",
    },
  },
  { timestamps: true }
);

MainMeterSchema.index({ periodStart: -1 });
MainMeterSchema.index({ status: 1 });

export const MainMeter: Model<MainMeterDocument> =
  (models.MainMeter as Model<MainMeterDocument>) ||
  mongoose.model<MainMeterDocument>("MainMeter", MainMeterSchema);
