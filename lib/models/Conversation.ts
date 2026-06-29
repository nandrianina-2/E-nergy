import mongoose, { Schema, Model, models } from "mongoose";

export interface ConversationDocument extends mongoose.Document {
  organizationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId; // absent = conversation générale
  subject: string;
  status: "open" | "closed";
  archivedByUser: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    subject: { type: String, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    archivedByUser: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ConversationSchema.index({ organizationId: 1, userId: 1, lastMessageAt: -1 });
ConversationSchema.index({ invoiceId: 1 });

export const Conversation: Model<ConversationDocument> =
  (models.Conversation as Model<ConversationDocument>) ||
  mongoose.model<ConversationDocument>("Conversation", ConversationSchema);
