import mongoose, { Schema, Model, models } from "mongoose";

export interface ConversationDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId; // absent = conversation générale
  subject: string;
  status: "open" | "closed";
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    subject: { type: String, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1, lastMessageAt: -1 });
ConversationSchema.index({ invoiceId: 1 });

export const Conversation: Model<ConversationDocument> =
  (models.Conversation as Model<ConversationDocument>) ||
  mongoose.model<ConversationDocument>("Conversation", ConversationSchema);
