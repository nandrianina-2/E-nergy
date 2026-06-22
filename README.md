# E-nergy — Gestion de consommation électrique

Application full-stack de gestion d'un compteur principal et de ses sous-compteurs, avec rôles Admin / Utilisateur, extraction OCR des factures, génération automatique de factures PDF, et suivi des paiements.

## Stack technique

- **Framework** : Next.js 15 (App Router) + TypeScript
- **Style** : Tailwind CSS v4
- **Base de données** : MongoDB + Mongoose
- **Authentification** : NextAuth v5 (credentials, JWT)
- **State client** : Zustand (préférences thème/langue)
- **OCR** : Tesseract.js (extraction des factures image)
- **PDF** : jsPDF + jspdf-autotable (génération des factures)
- **Stockage fichiers** : Cloudinary (photos de profil, factures importées)
- **Email** : Nodemailer (notifications)
- **Graphiques** : Recharts

## Prérequis

- Node.js v20 LTS (recommandé — éviter v25)
- Un cluster MongoDB Atlas (ou MongoDB local)
- Un compte Cloudinary (optionnel mais recommandé pour les photos de profil et factures)
- Un compte SMTP (Gmail, SendGrid, etc.) pour les emails de notification

## Installation

```powershell
npm install
```

Copier `.env.example` vers `.env.local` et renseigner les variables :

```powershell
cp .env.example .env.local
```

Variables requises :

| Variable | Description |
|---|---|
| `MONGODB_URI` | Chaîne de connexion MongoDB |
| `NEXTAUTH_SECRET` | Secret aléatoire (générer avec `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL de l'app (`http://localhost:3000` en dev) |
| `CLOUDINARY_*` | Identifiants Cloudinary |
| `SMTP_*` | Identifiants serveur SMTP |

## Créer le premier compte administrateur

```powershell
npm run seed:admin
```

Par défaut : `admin@e-nergy.app` / `Admin@123` (modifiable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dans `.env.local`).
**Changez ce mot de passe dès la première connexion.**

## Vider la base de données

```powershell
npm run reset:db
```

Par défaut, ce script supprime uniquement les **données métier/transactionnelles** : relevés, factures principales, factures de sous-compteurs, paiements, demandes de paiement, discussions, messages, notifications. Les utilisateurs, sous-compteurs, paramètres du site et configuration mobile money sont **préservés**.

Une confirmation (`oui`) est demandée avant toute suppression.

Options :
```powershell
# Supprimer uniquement certaines collections
npx tsx scripts/reset-db.ts --only=invoices,payments

# Tout supprimer, y compris utilisateurs et sous-compteurs (repartir de zéro complet)
npx tsx scripts/reset-db.ts --all
```

Après un `--all`, il faut relancer `npm run seed:admin` pour recréer un compte administrateur.

## Lancer en développement

```powershell
npm run dev
```

L'application est accessible sur `http://localhost:3000`.

## Build production

```powershell
npm run build
npm run start
```

## Architecture des dossiers

```
app/
  (auth)/login/             page de connexion
  (dashboard)/admin/        pages réservées aux administrateurs
  (dashboard)/user/         pages réservées aux utilisateurs
  api/                       routes API (REST)
lib/
  models/                    schémas Mongoose
  services/                  logique métier (allocation, OCR, PDF, email, notifications)
  i18n/                       dictionnaires FR / MG
  validations.ts             schémas Zod
  api-helpers.ts             helpers d'authentification/permissions
components/
  ui/                         composants UI réutilisables
  shared/                    sidebar, header, notifications, menu utilisateur
  charts/                     graphiques Recharts
middleware.ts                middleware de protection des routes (Next.js 15)
```

## Fonctionnalités principales

- **Import de facture principale** avec extraction OCR automatique (numéro de facture, index, consommation, montants, dates) — fonctionne sur images (PNG/JPG/WEBP). Les PDF doivent être convertis en image pour bénéficier de l'OCR.
- **Répartition automatique des coûts** entre sous-compteurs : proportionnelle à la consommation ou égale (configurable par facture).
- **Vérification de l'écart** entre le compteur principal et la somme des sous-compteurs (tolérance de 5%), avec notification automatique en cas d'écart anormal.
- **Génération de factures PDF** par sous-compteur, téléchargeables par l'utilisateur concerné.
- **Notifications in-app + email** : nouvelle facture, paiement reçu, écart de consommation, création de compte.
- **Mode clair/sombre** et **interface FR/MG**, persistés par utilisateur.
- **Sécurité des rôles** : un utilisateur ne peut jamais accéder aux données d'un autre sous-compteur (vérifié côté API, pas seulement côté UI).

## Notes pour l'extraction OCR

L'extraction fonctionne mieux sur des factures bien cadrées et lisibles. Les expressions reconnues incluent : "Ancien index", "Nouvel index", "Consommation", "Montant HT", "TVA/Taxe", "Montant total/Net à payer", "Date limite/Échéance", "Période du ... au ...". Si le format de votre facture diffère, les champs extraits devront être corrigés manuellement avant validation — c'est pourquoi le formulaire reste éditable après extraction.

## Application installable (PWA)

E-nergy peut être installée sur l'écran d'accueil (mobile) ou comme application de bureau, avec un mode hors-ligne basique.

- **Manifeste** : `public/manifest.json` — nom, icônes, couleurs, mode d'affichage.
- **Icônes** : générées dans `public/icons/` à partir de `public/icons/icon-source.svg` (éclair sur fond dégradé ambre, cohérent avec le thème). Pour les régénérer après modification du SVG :
  ```powershell
  node -e "const sharp=require('sharp');[72,96,128,144,152,192,384,512].forEach(s=>sharp('public/icons/icon-source.svg').resize(s,s).png().toFile(`public/icons/icon-${s}x${s}.png`))"
  ```
- **Service worker** : `public/sw.js` — stratégie cache-first pour les assets statiques (JS/CSS/icônes), network-first pour les pages et l'API (toujours la donnée la plus fraîche en priorité, cache en secours si hors-ligne). **Désactivé en développement** (`npm run dev`) pour ne pas masquer les changements de code ; actif uniquement en production (`npm run build && npm run start`).
- **Page hors-ligne** : `/offline`, affichée quand une page n'est ni en cache ni accessible réseau.
- **Invite d'installation** : un bouton "Installer l'application" apparaît automatiquement (page de connexion et menu utilisateur) quand le navigateur le permet (Chrome/Edge sur Android et desktop). Sur iOS, Safari ne propose pas cette invite native : l'utilisateur doit utiliser le bouton de partage puis "Sur l'écran d'accueil".

Important : les mutations (création, paiement, envoi de message, etc.) ne sont jamais servies depuis le cache — elles échouent proprement avec un message d'erreur si l'utilisateur est hors-ligne, pour éviter toute action sur une donnée obsolète.
