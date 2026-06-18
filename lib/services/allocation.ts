import { DiscrepancyResult } from "@/types";

interface SubmeterConsumption {
  submeterId: string;
  consumption: number;
}

interface AllocationResult {
  submeterId: string;
  consumption: number;
  unitPrice: number;
  amount: number;
  taxAmount: number;
  totalAmount: number;
}

interface AllocationInput {
  method: "proportional" | "equal";
  mainMeterConsumption: number;
  mainMeterAmount: number;
  mainMeterTaxAmount: number;
  mainMeterTotalAmount: number;
  submeters: SubmeterConsumption[];
}

const DISCREPANCY_TOLERANCE_PERCENT = 5; // tolérance de 5% entre compteur principal et somme des sous-compteurs

/**
 * Répartit le coût de la facture principale entre les sous-compteurs,
 * selon la méthode choisie (proportionnelle à la consommation, ou égale).
 */
export function allocateCosts(input: AllocationInput): AllocationResult[] {
  const { method, mainMeterTotalAmount, submeters } = input;

  if (submeters.length === 0) {
    return [];
  }

  const totalSubConsumption = submeters.reduce(
    (sum, s) => sum + s.consumption,
    0
  );

  if (method === "equal") {
    const share = mainMeterTotalAmount / submeters.length;
    const taxShare = input.mainMeterTaxAmount / submeters.length;
    const amountShare = input.mainMeterAmount / submeters.length;

    return submeters.map((s) => ({
      submeterId: s.submeterId,
      consumption: s.consumption,
      unitPrice:
        s.consumption > 0 ? round2(amountShare / s.consumption) : 0,
      amount: round2(amountShare),
      taxAmount: round2(taxShare),
      totalAmount: round2(share),
    }));
  }

  // Méthode proportionnelle à la consommation
  if (totalSubConsumption === 0) {
    // Évite la division par zéro : répartition égale en fallback
    return allocateCosts({ ...input, method: "equal" });
  }

  const globalUnitPrice = input.mainMeterAmount / totalSubConsumption;

  return submeters.map((s) => {
    const ratio = s.consumption / totalSubConsumption;
    const amount = round2(input.mainMeterAmount * ratio);
    const taxAmount = round2(input.mainMeterTaxAmount * ratio);
    const totalAmount = round2(amount + taxAmount);

    return {
      submeterId: s.submeterId,
      consumption: s.consumption,
      unitPrice: round2(globalUnitPrice),
      amount,
      taxAmount,
      totalAmount,
    };
  });
}

/**
 * Vérifie l'écart entre la consommation du compteur principal
 * et la somme des consommations des sous-compteurs.
 */
export function checkDiscrepancy(
  mainMeterConsumption: number,
  submetersConsumptions: number[]
): DiscrepancyResult {
  const submetersTotalConsumption = submetersConsumptions.reduce(
    (sum, c) => sum + c,
    0
  );

  const difference = mainMeterConsumption - submetersTotalConsumption;
  const differencePercent =
    mainMeterConsumption > 0
      ? Math.abs(difference / mainMeterConsumption) * 100
      : 0;

  return {
    mainMeterConsumption,
    submetersTotalConsumption,
    difference: round2(difference),
    differencePercent: round2(differencePercent),
    isWithinTolerance: differencePercent <= DISCREPANCY_TOLERANCE_PERCENT,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
