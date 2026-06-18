import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

export interface InvoicePdfData {
  invoiceNumber: string;
  submeterLabel: string;
  submeterCode: string;
  userName: string;
  userEmail: string;
  period: string;
  oldIndex: number;
  newIndex: number;
  consumption: number;
  unitPrice: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  dueDate: string;
  paymentStatus: "unpaid" | "partial" | "paid";
  amountPaid: number;
  issuedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  unpaid: "Non payé",
  partial: "Partiellement payé",
  paid: "Payé",
};

export function generateInvoicePDF(data: InvoicePdfData): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const primaryColor: [number, number, number] = [16, 122, 87]; // vert énergie
  const grayColor: [number, number, number] = [100, 100, 100];

  // En-tête
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("E-nergy", 14, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Gestion de consommation électrique", 14, 24);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`Facture N° ${data.invoiceNumber}`, 196, 18, { align: "right" });
  doc.setFontSize(9);
  doc.text(`Émise le ${formatDate(data.issuedAt)}`, 196, 24, {
    align: "right",
  });

  // Bloc informations client / sous-compteur
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Informations du sous-compteur", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const infoLines = [
    `Titulaire : ${data.userName}`,
    `Email : ${data.userEmail}`,
    `Sous-compteur : ${data.submeterLabel} (${data.submeterCode})`,
    `Période : ${formatPeriod(data.period)}`,
  ];
  infoLines.forEach((line, i) => {
    doc.text(line, 14, 49 + i * 6);
  });

  // Statut de paiement (badge)
  const statusColors: Record<string, [number, number, number]> = {
    paid: [22, 163, 74],
    partial: [217, 119, 6],
    unpaid: [220, 38, 38],
  };
  const statusColor = statusColors[data.paymentStatus] || grayColor;
  doc.setFillColor(...statusColor);
  doc.roundedRect(150, 42, 46, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(STATUS_LABELS[data.paymentStatus] || data.paymentStatus, 173, 48.5, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);

  // Tableau de consommation
  autoTable(doc, {
    startY: 78,
    head: [["Ancien index", "Nouvel index", "Consommation", "Prix unitaire"]],
    body: [
      [
        `${data.oldIndex} kWh`,
        `${data.newIndex} kWh`,
        `${data.consumption} kWh`,
        formatCurrency(data.unitPrice),
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: primaryColor, textColor: 255 },
    styles: { halign: "center", fontSize: 10 },
  });

  const afterFirstTable = (doc as any).lastAutoTable.finalY + 10;

  // Tableau du détail financier
  autoTable(doc, {
    startY: afterFirstTable,
    head: [["Description", "Montant"]],
    body: [
      ["Montant HT", formatCurrency(data.amount)],
      ["Taxes", formatCurrency(data.taxAmount)],
      ["Montant total", formatCurrency(data.totalAmount)],
      ["Montant payé", formatCurrency(data.amountPaid)],
      [
        "Reste à payer",
        formatCurrency(Math.max(data.totalAmount - data.amountPaid, 0)),
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: primaryColor, textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
    styles: { fontSize: 10 },
  });

  const afterSecondTable = (doc as any).lastAutoTable.finalY + 10;

  // Date limite de paiement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text(
    `Date limite de paiement : ${formatDate(data.dueDate)}`,
    14,
    afterSecondTable
  );

  // Pied de page
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...grayColor);
  doc.text(
    "Ce document est généré automatiquement par E-nergy. Pour toute question, contactez l'administrateur.",
    14,
    285
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
