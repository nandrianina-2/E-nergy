import mongoose, { Schema, Model, models } from "mongoose";

export interface UserDocument extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "admin" | "user";
  avatarUrl?: string;
  submeterId?: mongoose.Types.ObjectId;
  isActive: boolean;
  language: "fr" | "mg";
  theme: "light" | "dark";
  notificationPreferences?: Record<string, { inApp: boolean; email: boolean }>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationChannelSchema = new Schema(
  {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
  },
  { _id: false }
);

const UserSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    avatarUrl: { type: String },
    submeterId: { type: Schema.Types.ObjectId, ref: "Submeter" },
    isActive: { type: Boolean, default: true },
    language: { type: String, enum: ["fr", "mg"], default: "fr" },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    notificationPreferences: {
      type: Map,
      of: NotificationChannelSchema,
      default: undefined,
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });

export const User: Model<UserDocument> =
  (models.User as Model<UserDocument>) ||
  mongoose.model<UserDocument>("User", UserSchema);
