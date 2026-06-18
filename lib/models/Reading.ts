import mongoose, { Schema, Model, models } from "mongoose";

export interface ReadingDocument extends mongoose.Document {
  submeterId: mongoose.Types.ObjectId;
  mainMeterId?: mongoose.Types.ObjectId;
  period: string; // "YYYY-MM"
  oldIndex: number;
  newIndex: number;
  consumption: number;
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReadingSchema = new Schema<ReadingDocument>(
  {
    submeterId: {
      type: Schema.Types.ObjectId,
      ref: "Submeter",
      required: true,
    },
    mainMeterId: { type: Schema.Types.ObjectId, ref: "MainMeter" },
    period: { type: String, required: true },
    oldIndex: { type: Number, required: true },
    newIndex: { type: Number, required: true },
    consumption: { type: Number, required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Un seul relevé par sous-compteur et par période
ReadingSchema.index({ submeterId: 1, period: 1 }, { unique: true });
ReadingSchema.index({ period: 1 });

export const Reading: Model<ReadingDocument> =
  (models.Reading as Model<ReadingDocument>) ||
  mongoose.model<ReadingDocument>("Reading", ReadingSchema);
