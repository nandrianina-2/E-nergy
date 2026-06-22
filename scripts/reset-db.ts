/**
 * Script de nettoyage de la base de données.
 *
 * Utilisation :
 *   npx tsx scripts/reset-db.ts                  -> vide les données métier (mode par défaut)
 *   npx tsx scripts/reset-db.ts --all             -> vide TOUT y compris utilisateurs/sous-compteurs
 *   npx tsx scripts/reset-db.ts --only=readings,invoices,payments
 *
 * Collections concernées par le mode par défaut (données métier/transactionnelles) :
 *   readings, mainmeters, invoices, payments, paymentrequests,
 *   conversations, messages, notifications
 *
 * Collections JAMAIS touchées par défaut (sauf avec --all) :
 *   users, submeters, sitesettings, paymentmethods
 */
import mongoose from "mongoose";
import * as dotenv from "dotenv";
import * as readline from "readline";

dotenv.config({ path: ".env.local" });

const BUSINESS_DATA_COLLECTIONS = [
  "readings",
  "mainmeters",
  "invoices",
  "payments",
  "paymentrequests",
  "conversations",
  "messages",
  "notifications",
];

const PRESERVED_COLLECTIONS = [
  "users",
  "submeters",
  "sitesettings",
  "paymentmethods",
];

const ALL_COLLECTIONS = [...BUSINESS_DATA_COLLECTIONS, ...PRESERVED_COLLECTIONS];

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "oui");
    });
  });
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI n'est pas défini dans .env.local");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const wantsAll = args.includes("--all");
  const onlyArg = args.find((a) => a.startsWith("--only="));

  let targetCollections: string[];
  let modeLabel: string;

  if (onlyArg) {
    targetCollections = onlyArg.replace("--only=", "").split(",").map((s) => s.trim());
    modeLabel = `uniquement : ${targetCollections.join(", ")}`;
  } else if (wantsAll) {
    targetCollections = ALL_COLLECTIONS;
    modeLabel = "TOUT (y compris utilisateurs, sous-compteurs, paramètres)";
  } else {
    targetCollections = BUSINESS_DATA_COLLECTIONS;
    modeLabel = "données métier uniquement (relevés, factures, paiements, demandes, discussions, notifications)";
  }

  console.log("\n⚠️  Ce script va supprimer les données suivantes :");
  console.log(`   ${modeLabel}\n`);

  if (!wantsAll && !onlyArg) {
    console.log("Préservés : users, submeters, sitesettings, paymentmethods\n");
  }

  const confirmed = await askConfirmation('Tapez "oui" pour confirmer : ');
  if (!confirmed) {
    console.log("Annulé.");
    process.exit(0);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error("Connexion à la base impossible.");
    process.exit(1);
  }

  const existingCollections = (await db.listCollections().toArray()).map(
    (c) => c.name
  );

  for (const name of targetCollections) {
    if (!existingCollections.includes(name)) {
      console.log(`  - ${name} : collection inexistante, ignorée`);
      continue;
    }
    const result = await db.collection(name).deleteMany({});
    console.log(`  - ${name} : ${result.deletedCount} document(s) supprimé(s)`);
  }

  console.log("\n✅ Nettoyage terminé.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
