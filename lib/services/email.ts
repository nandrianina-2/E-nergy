import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function sendEmail(options: SendEmailOptions) {
  // Si la config SMTP n'est pas renseignée, on évite de planter l'app (utile en dev)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn(
      "[email] Configuration SMTP manquante — email non envoyé :",
      options.subject
    );
    return { skipped: true };
  }

  const t = getTransporter();

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });

  return { skipped: false };
}

// ─────────────────────────────────────────────────────────────────────────
// Système de templates — design unifié pour tous les emails E-nergy
// ─────────────────────────────────────────────────────────────────────────

export const APP_URL = "https://e-nergy.vercel.app";

const COLORS = {
  accent: "#d97706",
  accentDeep: "#92400e",
  accentLight: "#fef3c7",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e6e9ee",
  surface: "#f8fafc",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#d97706",
  info: "#0284c7",
};

interface EmailLayoutOptions {
  /** Texte court affiché dans la barre colorée d'en-tête (ex: "Nouvelle facture") */
  headerLabel: string;
  /** Couleur d'accent de l'en-tête et du bouton principal */
  accentColor?: string;
  /** Corps de l'email, en HTML (utiliser les helpers ci-dessous) */
  bodyHtml: string;
  /** Texte et lien du bouton d'action principal */
  cta: { label: string; href: string };
  /** Texte court affiché dans le client mail avant l'ouverture (preheader) */
  preheader?: string;
}

/**
 * Layout de base partagé par tous les emails : en-tête avec logo E-nergy,
 * zone de contenu, bouton d'action vers l'app, et pied de page avec lien de secours.
 */
function renderEmailLayout({
  headerLabel,
  accentColor = COLORS.accent,
  bodyHtml,
  cta,
  preheader,
}: EmailLayoutOptions): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>E-nergy</title>
</head>
<body style="margin:0; padding:0; background-color:${COLORS.surface}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${
    preheader
      ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>`
      : ""
  }
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.surface}; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.08);">

          <!-- En-tête -->
          <tr>
            <td style="background:linear-gradient(135deg,#92400e,#d97706 55%,#f59e0b); padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block; width:32px; height:32px; background:rgba(255,255,255,0.22); border-radius:8px; text-align:center; line-height:32px; font-size:18px; color:#ffffff; vertical-align:middle;">⚡</span>
                    <span style="font-size:18px; font-weight:700; color:#ffffff; vertical-align:middle; margin-left:10px;">E-nergy</span>
                  </td>
                  <td align="right">
                    <span style="font-size:13px; font-weight:600; color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.18); padding:5px 12px; border-radius:999px;">${headerLabel}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:32px;">
              <div style="color:${COLORS.ink}; font-size:15px; line-height:1.6;">
                ${bodyHtml}
              </div>

              <!-- Bouton d'action -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td style="border-radius:10px; background-color:${accentColor};">
                    <a href="${cta.href}" target="_blank" style="display:inline-block; padding:13px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:10px;">
                      ${cta.label} →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0; font-size:12.5px; color:${COLORS.muted};">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                <a href="${cta.href}" style="color:${accentColor}; word-break:break-all;">${cta.href}</a>
              </p>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="padding:20px 32px; border-top:1px solid ${COLORS.border}; background-color:${COLORS.surface};">
              <p style="margin:0; font-size:12px; color:${COLORS.muted}; text-align:center;">
                Cet email a été envoyé automatiquement par <a href="${APP_URL}" style="color:${COLORS.muted}; text-decoration:underline;">E-nergy</a> — merci de ne pas y répondre directement.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/** Tableau clé/valeur stylé, utilisé pour récapituler les détails d'une facture, d'un paiement, etc. */
function renderDetailsTable(rows: { label: string; value: string; emphasize?: boolean; color?: string }[]): string {
  const rowsHtml = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:9px 0; color:${COLORS.muted}; font-size:13.5px; border-bottom:1px solid ${COLORS.border};">${row.label}</td>
        <td style="padding:9px 0; text-align:right; font-size:13.5px; font-weight:${row.emphasize ? 700 : 500}; color:${row.color || COLORS.ink}; border-bottom:1px solid ${COLORS.border};">${row.value}</td>
      </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;">${rowsHtml}</table>`;
}

/** Bandeau d'alerte coloré (succès, avertissement, danger, info) */
function renderAlertBox(text: string, variant: "success" | "warning" | "danger" | "info"): string {
  const colorMap = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", text: COLORS.success },
    warning: { bg: "#fffbeb", border: "#fde68a", text: COLORS.warning },
    danger: { bg: "#fef2f2", border: "#fecaca", text: COLORS.danger },
    info: { bg: "#f0f9ff", border: "#bae6fd", text: COLORS.info },
  };
  const c = colorMap[variant];
  return `<div style="margin:16px 0; padding:12px 16px; background-color:${c.bg}; border:1px solid ${c.border}; border-radius:10px; color:${c.text}; font-size:13.5px; font-weight:600;">${text}</div>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Templates spécifiques
// ─────────────────────────────────────────────────────────────────────────

export function newInvoiceEmailTemplate(params: {
  userName: string;
  invoiceNumber: string;
  period: string;
  totalAmount: string;
  dueDate: string;
}): string {
  const body = `
    <p style="margin:0 0 8px;">Bonjour ${params.userName},</p>
    <p style="margin:0;">Votre nouvelle facture d'électricité est disponible. Voici un récapitulatif :</p>
    ${renderDetailsTable([
      { label: "N° Facture", value: params.invoiceNumber },
      { label: "Période", value: params.period },
      { label: "Montant total", value: params.totalAmount, emphasize: true },
      { label: "Date limite", value: params.dueDate, emphasize: true, color: COLORS.warning },
    ])}
    <p style="margin:0;">Connectez-vous à votre espace pour consulter le détail, télécharger le PDF, et régler votre facture en ligne.</p>
  `;

  return renderEmailLayout({
    headerLabel: "Nouvelle facture",
    bodyHtml: body,
    cta: { label: "Voir ma facture", href: `${APP_URL}/user/invoices` },
    preheader: `Votre facture ${params.invoiceNumber} de ${params.totalAmount} est disponible.`,
  });
}

export function paymentReminderEmailTemplate(params: {
  userName: string;
  invoiceNumber: string;
  totalAmount: string;
  dueDate: string;
  daysOverdue?: number;
}): string {
  const body = `
    <p style="margin:0 0 8px;">Bonjour ${params.userName},</p>
    <p style="margin:0;">Votre facture <strong>${params.invoiceNumber}</strong> est en retard de paiement.</p>
    ${renderAlertBox(
      params.daysOverdue
        ? `Retard de ${params.daysOverdue} jour(s) — échéance dépassée le ${params.dueDate}`
        : `Échéance dépassée le ${params.dueDate}`,
      "danger"
    )}
    ${renderDetailsTable([
      { label: "N° Facture", value: params.invoiceNumber },
      { label: "Montant dû", value: params.totalAmount, emphasize: true, color: COLORS.danger },
    ])}
    <p style="margin:0;">Merci de régulariser votre situation dès que possible directement depuis votre espace.</p>
  `;

  return renderEmailLayout({
    headerLabel: "Paiement en retard",
    accentColor: COLORS.danger,
    bodyHtml: body,
    cta: { label: "Régler ma facture", href: `${APP_URL}/user/invoices` },
    preheader: `Facture ${params.invoiceNumber} en retard — ${params.totalAmount} dû.`,
  });
}

export function readingReminderEmailTemplate(params: {
  userName: string;
  period: string;
}): string {
  const body = `
    <p style="margin:0 0 8px;">Bonjour ${params.userName},</p>
    <p style="margin:0;">N'oubliez pas de saisir votre relevé d'index pour la période de <strong>${params.period}</strong> avant la fin du mois.</p>
    <p style="margin:12px 0 0;">Cette saisie permet de calculer votre consommation et de générer votre prochaine facture dans les meilleurs délais.</p>
  `;

  return renderEmailLayout({
    headerLabel: "Rappel de saisie",
    bodyHtml: body,
    cta: { label: "Saisir mon relevé", href: `${APP_URL}/user/readings` },
    preheader: `Pensez à saisir votre relevé pour ${params.period}.`,
  });
}

export function paymentDecisionEmailTemplate(params: {
  userName: string;
  invoiceNumber: string;
  amount: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
}): string {
  const isApproved = params.decision === "approved";

  const body = `
    <p style="margin:0 0 8px;">Bonjour ${params.userName},</p>
    <p style="margin:0;">
      ${
        isApproved
          ? `Votre paiement pour la facture <strong>${params.invoiceNumber}</strong> a été <strong style="color:${COLORS.success};">validé</strong> par l'administrateur.`
          : `Votre déclaration de paiement pour la facture <strong>${params.invoiceNumber}</strong> a été <strong style="color:${COLORS.danger};">rejetée</strong>.`
      }
    </p>
    ${
      isApproved
        ? renderAlertBox(`Paiement de ${params.amount} confirmé. Merci !`, "success")
        : renderAlertBox(
            params.rejectionReason
              ? `Raison indiquée : ${params.rejectionReason}`
              : "Aucune raison spécifique n'a été indiquée.",
            "danger"
          )
    }
    ${
      !isApproved
        ? `<p style="margin:0;">Vous pouvez nous contacter via la discussion liée à cette facture pour clarifier la situation ou renvoyer une preuve de paiement.</p>`
        : ""
    }
  `;

  return renderEmailLayout({
    headerLabel: isApproved ? "Paiement validé" : "Paiement rejeté",
    accentColor: isApproved ? COLORS.success : COLORS.danger,
    bodyHtml: body,
    cta: {
      label: isApproved ? "Voir mes paiements" : "Ouvrir la discussion",
      href: isApproved ? `${APP_URL}/user/payments` : `${APP_URL}/user/conversations`,
    },
    preheader: isApproved
      ? `Votre paiement de ${params.amount} a été validé.`
      : `Votre paiement pour la facture ${params.invoiceNumber} a été rejeté.`,
  });
}

export function newMessageEmailTemplate(params: {
  recipientName: string;
  senderName: string;
  subject: string;
  messagePreview: string;
  isAdminRecipient: boolean;
}): string {
  const body = `
    <p style="margin:0 0 8px;">Bonjour ${params.recipientName},</p>
    <p style="margin:0;">Vous avez un nouveau message de <strong>${params.senderName}</strong> concernant : <strong>${params.subject}</strong></p>
    <div style="margin:16px 0; padding:14px 16px; background-color:${COLORS.surface}; border-left:3px solid ${COLORS.accent}; border-radius:8px; font-size:13.5px; color:${COLORS.muted}; font-style:italic;">
      « ${params.messagePreview} »
    </div>
    <p style="margin:0;">Ce message attend une réponse depuis un moment — pensez à y jeter un œil.</p>
  `;

  return renderEmailLayout({
    headerLabel: "Nouveau message",
    accentColor: COLORS.info,
    bodyHtml: body,
    cta: {
      label: "Répondre",
      href: params.isAdminRecipient ? `${APP_URL}/admin/conversations` : `${APP_URL}/user/conversations`,
    },
    preheader: `${params.senderName} vous a écrit : ${params.subject}`,
  });
}

export function accountCreatedEmailTemplate(params: { userName: string }): string {
  const body = `
    <p style="margin:0 0 8px;">Bonjour ${params.userName},</p>
    <p style="margin:0;">Votre compte E-nergy a été créé avec succès. Vous pouvez désormais suivre votre consommation électrique, consulter vos factures et gérer vos paiements directement en ligne.</p>
  `;

  return renderEmailLayout({
    headerLabel: "Bienvenue",
    bodyHtml: body,
    cta: { label: "Accéder à mon espace", href: APP_URL },
    preheader: "Votre compte E-nergy est prêt.",
  });
}

export function discrepancyAlertEmailTemplate(params: {
  adminName?: string;
  mainMeterConsumption: number;
  submetersTotal: number;
  differencePercent: number;
}): string {
  const body = `
    <p style="margin:0 0 8px;">Bonjour ${params.adminName || "Administrateur"},</p>
    <p style="margin:0;">Un écart anormal a été détecté entre le compteur principal et la somme des sous-compteurs.</p>
    ${renderAlertBox(`Écart de ${params.differencePercent.toFixed(1)}%`, "danger")}
    ${renderDetailsTable([
      { label: "Compteur principal", value: `${params.mainMeterConsumption} kWh` },
      { label: "Somme des sous-compteurs", value: `${params.submetersTotal} kWh` },
    ])}
  `;

  return renderEmailLayout({
    headerLabel: "Alerte écart",
    accentColor: COLORS.danger,
    bodyHtml: body,
    cta: { label: "Voir les statistiques", href: `${APP_URL}/admin/statistics` },
    preheader: `Écart de ${params.differencePercent.toFixed(1)}% détecté.`,
  });
}
