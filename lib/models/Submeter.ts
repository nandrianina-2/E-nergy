import mongoose, { Schema, Model, models } from "mongoose";

export interface SubmeterDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  code: string;
  label: string;
  userId?: mongoose.Types.ObjectId;
  initialIndex: number;
  isActive: boolean;
  lastReadingReminderPeriod?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubmeterSchema = new Schema<SubmeterDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    code: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    initialIndex: { type: Number, required: true, default: 0 },
    isActive: { type: Boolean, default: true },
    lastReadingReminderPeriod: { type: String }, // format "YYYY-MM", évite les doublons
  },
  { timestamps: true }
);

// Le code doit être unique au sein d'une organisation, mais deux organisations
// différentes peuvent réutiliser le même code (ex: "SM-001" chacune chez elles).
SubmeterSchema.index({ organizationId: 1, code: 1 }, { unique: true });
SubmeterSchema.index({ organizationId: 1, userId: 1 });

export const Submeter: Model<SubmeterDocument> =
  (models.Submeter as Model<SubmeterDocument>) ||
  mongoose.model<SubmeterDocument>("Submeter", SubmeterSchema);
