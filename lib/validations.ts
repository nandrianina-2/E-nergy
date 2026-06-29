import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const createUserSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  phone: z.string().optional(),
  role: z.enum(["admin", "user"]).default("user"),
  submeterId: z.string().optional(),
  language: z.enum(["fr", "mg"]).default("fr"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["admin", "user"]).optional(),
  submeterId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  language: z.enum(["fr", "mg"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
});

export const createSubmeterSchema = z.object({
  code: z.string().min(2, "Le code est requis"),
  label: z.string().min(2, "Le libellé est requis"),
  userId: z.string().optional(),
  initialIndex: z.number().min(0).default(0),
});

export const updateSubmeterSchema = z.object({
  code: z.string().min(2).optional(),
  label: z.string().min(2).optional(),
  userId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createMainMeterSchema = z.object({
  invoiceNumber: z.string().min(1, "Numéro de facture requis"),
  oldIndex: z.number().min(0),
  newIndex: z.number().min(0),
  amount: z.number().min(0),
  taxAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  periodStart: z.string(),
  periodEnd: z.string(),
  dueDate: z.string(),
  allocationMethod: z.enum(["proportional", "equal"]).default("proportional"),
  fileUrl: z.string().optional(),
  ocrRawText: z.string().optional(),
  ocrConfidence: z.number().optional(),
}).refine((data) => data.newIndex >= data.oldIndex, {
  message: "Le nouvel index doit être supérieur ou égal à l'ancien index",
  path: ["newIndex"],
});

export const createReadingSchema = z.object({
  submeterId: z.string().min(1, "Sous-compteur requis"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format de période invalide (YYYY-MM)"),
  newIndex: z.number().min(0, "L'index doit être positif"),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.number().min(0.01, "Le montant doit être supérieur à 0"),
  method: z.enum(["cash", "transfer", "mobile_money", "other"]).default("cash"),
  note: z.string().optional(),
  paymentDate: z.string().optional(),
});

export const generateInvoicesSchema = z.object({
  mainMeterId: z.string().min(1),
});

export const upsertPaymentMethodSchema = z.object({
  operator: z.enum(["mvola", "orange_money", "airtel_money"]),
  label: z.string().min(1, "Le libellé est requis"),
  transferCode: z.string().min(1, "Le code de transfert est requis"),
  ussdTemplate: z
    .string()
    .min(1, "Le modèle USSD est requis")
    .regex(/#$/, "Le code USSD doit se terminer par #"),
  isActive: z.boolean().default(true),
});

export const updateSiteSettingsSchema = z.object({
  siteName: z.string().min(1, "Le nom du site est requis").optional(),
  logoUrl: z.string().url().optional(),
  supportPhone: z.string().optional(),
  supportEmail: z.string().email().optional(),
  supportAddress: z.string().optional(),
});

export const createReadingByAdminSchema = z.object({
  submeterId: z.string().min(1, "Sous-compteur requis"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format de période invalide (YYYY-MM)"),
  newIndex: z.number().min(0, "L'index doit être positif"),
});

export const createPaymentRequestSchema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(["mvola", "orange_money", "airtel_money", "cash"]),
});

export const reviewPaymentRequestSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

export const createConversationSchema = z.object({
  userId: z.string().optional(), // requis si créée par un admin pour un utilisateur
  invoiceId: z.string().optional(),
  subject: z.string().min(1, "Le sujet est requis"),
  text: z.string().min(1, "Le message ne peut pas être vide").optional(),
  imageUrl: z.string().url().optional(),
});

export const sendMessageSchema = z
  .object({
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  })
  .refine((data) => data.text || data.imageUrl, {
    message: "Le message doit contenir du texte ou une image",
  });

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.record(
    z.string(),
    z.object({
      inApp: z.boolean(),
      email: z.boolean(),
    })
  ),
});

// ─── Super-admin : gestion des organisations et de leurs administrateurs ───

export const createOrganizationSchema = z.object({
  organizationName: z.string().min(2, "Le nom de l'organisation est requis"),
  monthlyFee: z.number().min(0).default(0),
  subscriptionStatus: z
    .enum(["active", "trial", "suspended", "expired"])
    .default("trial"),
  // Compte admin créé en même temps que l'organisation
  adminName: z.string().min(2, "Le nom de l'administrateur est requis"),
  adminEmail: z.string().email("Email invalide"),
  adminPassword: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  adminPhone: z.string().optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  monthlyFee: z.number().min(0).optional(),
  subscriptionStatus: z
    .enum(["active", "trial", "suspended", "expired"])
    .optional(),
  subscriptionExpiresAt: z.string().nullable().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});
