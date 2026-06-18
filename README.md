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
proxy.ts                     middleware de protection des routes (équivalent middleware.ts)
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

```
e-nergy
├─ app
│  ├─ (auth)
│  │  ├─ layout.tsx
│  │  └─ login
│  │     └─ page.tsx
│  ├─ (dashboard)
│  │  ├─ admin
│  │  │  ├─ dashboard
│  │  │  │  └─ page.tsx
│  │  │  ├─ invoices
│  │  │  │  └─ page.tsx
│  │  │  ├─ main-meter
│  │  │  │  └─ page.tsx
│  │  │  ├─ notifications
│  │  │  │  └─ page.tsx
│  │  │  ├─ statistics
│  │  │  │  └─ page.tsx
│  │  │  ├─ submeters
│  │  │  │  └─ page.tsx
│  │  │  └─ users
│  │  │     └─ page.tsx
│  │  ├─ layout.tsx
│  │  └─ user
│  │     ├─ dashboard
│  │     │  └─ page.tsx
│  │     ├─ invoices
│  │     │  └─ page.tsx
│  │     ├─ payments
│  │     │  └─ page.tsx
│  │     ├─ profile
│  │     │  └─ page.tsx
│  │     └─ readings
│  │        └─ page.tsx
│  ├─ api
│  │  ├─ auth
│  │  │  └─ [...nextauth]
│  │  │     └─ route.ts
│  │  ├─ dashboard
│  │  │  ├─ charts
│  │  │  │  └─ route.ts
│  │  │  ├─ route.ts
│  │  │  └─ user
│  │  │     └─ route.ts
│  │  ├─ invoices
│  │  │  ├─ generate
│  │  │  │  └─ route.ts
│  │  │  ├─ route.ts
│  │  │  └─ [id]
│  │  │     ├─ pdf
│  │  │     │  └─ route.ts
│  │  │     └─ route.ts
│  │  ├─ main-meter
│  │  │  ├─ discrepancy
│  │  │  │  └─ route.ts
│  │  │  ├─ extract
│  │  │  │  └─ route.ts
│  │  │  ├─ route.ts
│  │  │  └─ [id]
│  │  │     └─ route.ts
│  │  ├─ notifications
│  │  │  └─ route.ts
│  │  ├─ payments
│  │  │  └─ route.ts
│  │  ├─ profile
│  │  │  ├─ password
│  │  │  │  └─ route.ts
│  │  │  └─ route.ts
│  │  ├─ readings
│  │  │  └─ route.ts
│  │  ├─ submeters
│  │  │  ├─ route.ts
│  │  │  └─ [id]
│  │  │     └─ route.ts
│  │  ├─ upload
│  │  │  ├─ invoice-file
│  │  │  │  └─ route.ts
│  │  │  └─ signature
│  │  │     └─ route.ts
│  │  └─ users
│  │     ├─ route.ts
│  │     └─ [id]
│  │        └─ route.ts
│  ├─ favicon.ico
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ page.tsx
│  └─ providers
│     ├─ Providers.tsx
│     └─ ThemeProvider.tsx
├─ components
│  ├─ admin
│  ├─ charts
│  │  ├─ ConsumptionChart.tsx
│  │  └─ PaymentsChart.tsx
│  ├─ shared
│  │  ├─ Header.tsx
│  │  ├─ NotificationsDropdown.tsx
│  │  ├─ Sidebar.tsx
│  │  └─ UserMenu.tsx
│  ├─ ui
│  │  ├─ Badge.tsx
│  │  ├─ Button.tsx
│  │  ├─ Card.tsx
│  │  ├─ EmptyState.tsx
│  │  ├─ Input.tsx
│  │  ├─ Modal.tsx
│  │  ├─ Pagination.tsx
│  │  ├─ Select.tsx
│  │  └─ StatCard.tsx
│  └─ user
├─ fra.traineddata
├─ hooks
│  ├─ useFetch.ts
│  ├─ useNotifications.ts
│  └─ useTranslation.ts
├─ lib
│  ├─ api-helpers.ts
│  ├─ auth
│  │  ├─ config.ts
│  │  └─ types.d.ts
│  ├─ db.ts
│  ├─ i18n
│  │  ├─ fr.ts
│  │  ├─ index.ts
│  │  └─ mg.ts
│  ├─ models
│  │  ├─ index.ts
│  │  ├─ Invoice.ts
│  │  ├─ MainMeter.ts
│  │  ├─ Notification.ts
│  │  ├─ Payment.ts
│  │  ├─ Reading.ts
│  │  ├─ Submeter.ts
│  │  └─ User.ts
│  ├─ services
│  │  ├─ allocation.ts
│  │  ├─ email.ts
│  │  ├─ notifications.ts
│  │  ├─ ocr.ts
│  │  └─ pdf.ts
│  ├─ store
│  │  └─ preferences.ts
│  ├─ utils.ts
│  └─ validations.ts
├─ middleware.ts
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.mjs
├─ public
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ README.md
├─ scripts
│  └─ seed-admin.ts
├─ tsconfig.json
└─ types
   └─ index.ts

```#   E - n e r g y  
 