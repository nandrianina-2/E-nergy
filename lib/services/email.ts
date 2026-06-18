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

export function newInvoiceEmailTemplate(params: {
  userName: string;
  invoiceNumber: string;
  period: string;
  totalAmount: string;
  dueDate: string;
}) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background:#107a57; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color:white; margin:0; font-size: 22px;">E-nergy</h1>
    </div>
    <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
      <p>Bonjour ${params.userName},</p>
      <p>Votre nouvelle facture d'électricité est disponible.</p>
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding:8px 0; color:#666;">N° Facture</td><td style="padding:8px 0; text-align:right; font-weight:bold;">${params.invoiceNumber}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Période</td><td style="padding:8px 0; text-align:right;">${params.period}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Montant total</td><td style="padding:8px 0; text-align:right; font-weight:bold;">${params.totalAmount}</td></tr>
        <tr><td style="padding:8px 0; color:#666;">Date limite</td><td style="padding:8px 0; text-align:right; color:#d97706; font-weight:bold;">${params.dueDate}</td></tr>
      </table>
      <p>Connectez-vous à votre espace E-nergy pour consulter le détail et télécharger votre facture.</p>
      <p style="color:#999; font-size: 12px; margin-top: 24px;">Cet email a été généré automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
  `;
}

export function paymentReminderEmailTemplate(params: {
  userName: string;
  invoiceNumber: string;
  totalAmount: string;
  dueDate: string;
}) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background:#dc2626; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color:white; margin:0; font-size: 22px;">⚠ Rappel de paiement</h1>
    </div>
    <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
      <p>Bonjour ${params.userName},</p>
      <p>Votre facture <strong>${params.invoiceNumber}</strong> d'un montant de <strong>${params.totalAmount}</strong> est en retard de paiement (date limite : ${params.dueDate}).</p>
      <p>Merci de régulariser votre situation rapidement.</p>
    </div>
  </div>
  `;
}

export function readingReminderEmailTemplate(params: {
  userName: string;
  period: string;
}) {
  return `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background:#107a57; padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color:white; margin:0; font-size: 22px;">Rappel de saisie</h1>
    </div>
    <div style="padding: 24px; border: 1px solid #eee; border-top: none; border-radius: 0 0 8px 8px;">
      <p>Bonjour ${params.userName},</p>
      <p>N'oubliez pas de saisir votre nouvel index pour la période de <strong>${params.period}</strong>.</p>
      <p>Connectez-vous à votre espace E-nergy pour effectuer votre relevé.</p>
    </div>
  </div>
  `;
}
