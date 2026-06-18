import mongoose, { Schema, Model, models } from "mongoose";

export interface SubmeterDocument extends mongoose.Document {
  code: string;
  label: string;
  userId?: mongoose.Types.ObjectId;
  initialIndex: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubmeterSchema = new Schema<SubmeterDocument>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    initialIndex: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SubmeterSchema.index({ code: 1 });
SubmeterSchema.index({ userId: 1 });

export const Submeter: Model<SubmeterDocument> =
  (models.Submeter as Model<SubmeterDocument>) ||
  mongoose.model<SubmeterDocument>("Submeter", SubmeterSchema);
