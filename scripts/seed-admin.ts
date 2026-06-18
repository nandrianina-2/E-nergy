/**
 * Script de seed : crée le premier compte administrateur.
 * Utilisation : npx tsx scripts/seed-admin.ts
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["admin", "user"], default: "user" },
    isActive: { type: Boolean, default: true },
    language: { type: String, default: "fr" },
    theme: { type: String, default: "light" },
  },
  { timestamps: true }
);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI n'est pas défini dans .env.local");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const email = process.env.SEED_ADMIN_EMAIL || "admin@e-nergy.app";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@123";

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Un compte avec l'email ${email} existe déjà.`);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await User.create({
    name: "Administrateur",
    email,
    password: hashedPassword,
    role: "admin",
    isActive: true,
  });

  console.log("Compte administrateur créé avec succès :");
  console.log(`  Email    : ${email}`);
  console.log(`  Mot de passe : ${password}`);
  console.log("Pensez à changer ce mot de passe après la première connexion.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
