import Tesseract from "tesseract.js";

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  oldIndex?: number;
  newIndex?: number;
  consumption?: number;
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
  rawText: string;
  confidence: number;
}

/**
 * Lance l'OCR sur une image (buffer) et retourne le texte brut + confiance.
 * Pour les PDF, il faut d'abord convertir en image ou extraire le texte via pdf-parse.
 */
export async function runOCR(
  imageBuffer: Buffer
): Promise<{ text: string; confidence: number }> {
  const result = await Tesseract.recognize(imageBuffer, "fra", {
    logger: () => {}, // silencieux côté serveur
  });

  return {
    text: result.data.text,
    confidence: result.data.confidence,
  };
}

/**
 * Parse le texte brut extrait par OCR pour en déduire les champs structurés
 * d'une facture d'électricité (JIRAMA ou autre format malgache/français standard).
 */
export function parseInvoiceText(rawText: string): Omit<
  ExtractedInvoiceData,
  "rawText" | "confidence"
> {
  const text = rawText.replace(/\r/g, "");
  const normalized = text.toLowerCase();

  const result: Omit<ExtractedInvoiceData, "rawText" | "confidence"> = {};

  // Numéro de facture (ex: "Facture N° 123456", "N° Facture: ABC-123", "Invoice No 123")
  const invoiceNumberMatch = text.match(
    /(?:facture|invoice|n[°o]\.?)\s*[:n°o]*\s*([A-Z0-9\-\/]{4,20})/i
  );
  if (invoiceNumberMatch) {
    result.invoiceNumber = invoiceNumberMatch[1].trim();
  }

  // Ancien index / index précédent
  const oldIndexMatch = text.match(
    /(?:ancien\s*index|index\s*pr[ée]c[ée]dent|old\s*index|index\s*ant[ée]rieur)\s*[:=]?\s*([\d\s.,]+)/i
  );
  if (oldIndexMatch) {
    result.oldIndex = parseLooseNumber(oldIndexMatch[1]);
  }

  // Nouvel index
  const newIndexMatch = text.match(
    /(?:nouvel\s*index|nouveau\s*index|index\s*actuel|new\s*index)\s*[:=]?\s*([\d\s.,]+)/i
  );
  if (newIndexMatch) {
    result.newIndex = parseLooseNumber(newIndexMatch[1]);
  }

  // Consommation (en kWh)
  const consumptionMatch = text.match(
    /(?:consommation|consumption)\s*[:=]?\s*([\d\s.,]+)\s*kwh/i
  );
  if (consumptionMatch) {
    result.consumption = parseLooseNumber(consumptionMatch[1]);
  } else if (result.oldIndex !== undefined && result.newIndex !== undefined) {
    result.consumption = result.newIndex - result.oldIndex;
  }

  // Montant HT
  const amountMatch = text.match(
    /(?:montant\s*ht|montant\s*hors\s*taxe)\s*[:=]?\s*([\d\s.,]+)/i
  );
  if (amountMatch) {
    result.amount = parseLooseNumber(amountMatch[1]);
  }

  // Taxes / TVA
  const taxMatch = text.match(
    /(?:tva|taxe|vat)\s*[:=]?\s*([\d\s.,]+)/i
  );
  if (taxMatch) {
    result.taxAmount = parseLooseNumber(taxMatch[1]);
  }

  // Montant total / net à payer
  const totalMatch = text.match(
    /(?:montant\s*total|total\s*[àa]\s*payer|net\s*[àa]\s*payer|montant\s*ttc)\s*[:=]?\s*([\d\s.,]+)/i
  );
  if (totalMatch) {
    result.totalAmount = parseLooseNumber(totalMatch[1]);
  }

  // Date limite / échéance
  const dueDateMatch = text.match(
    /(?:date\s*limite|[ée]ch[ée]ance|due\s*date|[àa]\s*payer\s*avant\s*le)\s*[:=]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  );
  if (dueDateMatch) {
    result.dueDate = normalizeDate(dueDateMatch[1]);
  }

  // Période (recherche de deux dates consécutives, ex: "Période du 01/01/2025 au 31/01/2025")
  const periodMatch = text.match(
    /(?:p[ée]riode|du)\s*(?:du)?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s*(?:au|[àa]|-)\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  );
  if (periodMatch) {
    result.periodStart = normalizeDate(periodMatch[1]);
    result.periodEnd = normalizeDate(periodMatch[2]);
  }

  return result;
}

function parseLooseNumber(raw: string): number {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/(?<=\d)[.,](?=\d{3}(\D|$))/g, "") // enlève séparateurs de milliers
    .replace(",", "."); // virgule décimale -> point
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

function normalizeDate(raw: string): string {
  const parts = raw.split(/[\/\-\.]/);
  if (parts.length !== 3) return raw;

  let [d, m, y] = parts;
  if (y.length === 2) y = `20${y}`;

  const day = d.padStart(2, "0");
  const month = m.padStart(2, "0");

  return `${y}-${month}-${day}`;
}

/**
 * Fonction complète : prend un buffer image et retourne les données extraites + structurées.
 */
export async function extractInvoiceData(
  imageBuffer: Buffer
): Promise<ExtractedInvoiceData> {
  const { text, confidence } = await runOCR(imageBuffer);
  const parsed = parseInvoiceText(text);

  return {
    ...parsed,
    rawText: text,
    confidence,
  };
}
