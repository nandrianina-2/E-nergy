import mongoose, { Schema, Model, models } from "mongoose";

export interface MessageDocument extends mongoose.Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: "admin" | "user";
  text?: string;
  imageUrl?: string;
  isRead: boolean;
  createdAt: Date;
}

const MessageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["admin", "user"], required: true },
    text: { type: String },
    imageUrl: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message: Model<MessageDocument> =
  (models.Message as Model<MessageDocument>) ||
  mongoose.model<MessageDocument>("Message", MessageSchema);
