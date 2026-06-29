/**
 * Script de seed : crée le premier compte super-administrateur.
 * Le super-admin n'appartient à aucune organisation : il supervise toutes
 * les organisations (chaque admin gère ensuite son propre immeuble/compteur).
 *
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
    role: { type: String, enum: ["super_admin", "admin", "user"], default: "user" },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
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
    name: "Administrateur principal",
    email,
    password: hashedPassword,
    role: "super_admin",
    isActive: true,
  });

  console.log("Compte super-administrateur créé avec succès :");
  console.log(`  Email    : ${email}`);
  console.log(`  Mot de passe : ${password}`);
  console.log("");
  console.log("Ce compte n'appartient à aucune organisation : il supervise");
  console.log("toutes les organisations depuis /super-admin/organizations.");
  console.log("Créez-y votre première organisation (ou celle d'un autre admin)");
  console.log("pour commencer à gérer des compteurs et des locataires.");
  console.log("");
  console.log("Pensez à changer ce mot de passe après la première connexion.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
