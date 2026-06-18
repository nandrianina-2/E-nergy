"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  Upload,
  FileText,
  Sparkles,
  Loader2,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createMainMeterSchema } from "@/lib/validations";
import { IMainMeter } from "@/types";
import { formatCurrency, formatDate, formatPeriod } from "@/lib/utils";

type MainMeterForm = z.input<typeof createMainMeterSchema>;

interface MainMetersResponse {
  mainMeters: IMainMeter[];
}

const statusConfig: Record<string, { label: string; variant: "neutral" | "info" | "success" }> = {
  draft: { label: "Brouillon", variant: "neutral" },
  validated: { label: "Validée", variant: "info" },
  allocated: { label: "Répartie", variant: "success" },
};

export default function AdminMainMeterPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  const { data, isLoading, refetch } = useFetch<MainMetersResponse>(
    "/api/main-meter?limit=12"
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<MainMeterForm>({
    resolver: zodResolver(createMainMeterSchema),
    defaultValues: { allocationMethod: "proportional", taxAmount: 0 },
  });

  const oldIndex = watch("oldIndex");
  const newIndex = watch("newIndex");
  const consumption =
    typeof oldIndex === "number" && typeof newIndex === "number"
      ? Math.max(newIndex - oldIndex, 0)
      : 0;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function handleExtract() {
    if (!selectedFile) {
      toast.error("Sélectionnez d'abord un fichier image");
      return;
    }
    if (!selectedFile.type.startsWith("image/")) {
      toast.error(
        "L'extraction OCR fonctionne sur les images (PNG/JPG). Pour un PDF, convertissez-le d'abord en image."
      );
      return;
    }

    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/main-meter/extract", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      const { extracted } = json;
      setOcrConfidence(extracted.confidence);

      if (extracted.invoiceNumber) setValue("invoiceNumber", extracted.invoiceNumber);
      if (extracted.oldIndex !== undefined) setValue("oldIndex", extracted.oldIndex);
      if (extracted.newIndex !== undefined) setValue("newIndex", extracted.newIndex);
      if (extracted.amount !== undefined) setValue("amount", extracted.amount);
      if (extracted.taxAmount !== undefined) setValue("taxAmount", extracted.taxAmount);
      if (extracted.totalAmount !== undefined) setValue("totalAmount", extracted.totalAmount);
      if (extracted.periodStart) setValue("periodStart", extracted.periodStart);
      if (extracted.periodEnd) setValue("periodEnd", extracted.periodEnd);
      if (extracted.dueDate) setValue("dueDate", extracted.dueDate);

      toast.success(
        "Extraction terminée — vérifiez les champs avant de valider"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'extraction OCR");
    } finally {
      setIsExtracting(false);
    }
  }

  async function onSubmit(formData: MainMeterForm) {
    setIsSubmitting(true);
    try {
      let fileUrl: string | undefined;

      if (selectedFile) {
        const uploadData = new FormData();
        uploadData.append("file", selectedFile);
        const uploadRes = await fetch("/api/upload/invoice-file", {
          method: "POST",
          body: uploadData,
        });
        const uploadJson = await uploadRes.json();
        if (uploadRes.ok) fileUrl = uploadJson.url;
      }

      const res = await fetch("/api/main-meter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, fileUrl }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Facture principale enregistrée");
      reset({ allocationMethod: "proportional", taxAmount: 0 });
      setSelectedFile(null);
      setOcrConfidence(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGenerateInvoices(mainMeterId: string) {
    if (
      !confirm(
        "Générer les factures des sous-compteurs pour cette période ? Cette action est irréversible."
      )
    )
      return;

    setIsGenerating(mainMeterId);
    try {
      const res = await fetch("/api/invoices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainMeterId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (!json.discrepancy.isWithinTolerance) {
        toast.warning(
          `Factures générées, mais écart de ${json.discrepancy.differencePercent.toFixed(
            1
          )}% détecté entre compteur principal et sous-compteurs.`
        );
      } else {
        toast.success(`${json.count} facture(s) générée(s) avec succès`);
      }
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la génération");
    } finally {
      setIsGenerating(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Compteur principal
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Importez la facture principale et générez les factures des sous-compteurs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importer une nouvelle facture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border-color)] bg-[var(--background-muted)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
                <Upload className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {selectedFile ? selectedFile.name : "Aucun fichier sélectionné"}
                </p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Image (PNG/JPG) pour extraction OCR, ou PDF pour archivage
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="invoice-file"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choisir un fichier
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleExtract}
                isLoading={isExtracting}
                disabled={!selectedFile}
              >
                <Sparkles className="h-4 w-4" />
                Extraire (OCR)
              </Button>
            </div>
          </div>

          {ocrConfidence !== null && (
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-[var(--info)]/10 px-3 py-2 text-sm text-[var(--info)]">
              <Sparkles className="h-4 w-4" />
              Confiance OCR : {ocrConfidence.toFixed(0)}% — vérifiez les champs
              extraits avant de valider.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Numéro de facture"
              error={errors.invoiceNumber?.message}
              {...register("invoiceNumber")}
            />
            <Select label="Méthode de répartition" {...register("allocationMethod")}>
              <option value="proportional">Proportionnelle à la consommation</option>
              <option value="equal">Répartition égale</option>
            </Select>

            <Input
              label="Ancien index (kWh)"
              type="number"
              step="0.01"
              error={errors.oldIndex?.message}
              {...register("oldIndex", { valueAsNumber: true })}
            />
            <Input
              label="Nouvel index (kWh)"
              type="number"
              step="0.01"
              error={errors.newIndex?.message}
              {...register("newIndex", { valueAsNumber: true })}
            />

            <div className="sm:col-span-2 rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--accent-deep)]">
              Consommation calculée : {consumption.toFixed(2)} kWh
            </div>

            <Input
              label="Montant HT"
              type="number"
              step="0.01"
              error={errors.amount?.message}
              {...register("amount", { valueAsNumber: true })}
            />
            <Input
              label="Taxes"
              type="number"
              step="0.01"
              error={errors.taxAmount?.message}
              {...register("taxAmount", { valueAsNumber: true })}
            />
            <Input
              label="Montant total"
              type="number"
              step="0.01"
              error={errors.totalAmount?.message}
              {...register("totalAmount", { valueAsNumber: true })}
            />
            <Input
              label="Date limite de paiement"
              type="date"
              error={errors.dueDate?.message}
              {...register("dueDate")}
            />

            <Input
              label="Début de période"
              type="date"
              error={errors.periodStart?.message}
              {...register("periodStart")}
            />
            <Input
              label="Fin de période"
              type="date"
              error={errors.periodEnd?.message}
              {...register("periodEnd")}
            />

            <div className="sm:col-span-2 mt-2 flex justify-end">
              <Button type="submit" isLoading={isSubmitting}>
                <FileText className="h-4 w-4" />
                Enregistrer la facture
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des factures principales</CardTitle>
        </CardHeader>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.mainMeters.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aucune facture importée"
            description="Importez votre première facture principale ci-dessus."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-medium">N° Facture</th>
                  <th className="px-4 py-3 font-medium">Période</th>
                  <th className="px-4 py-3 font-medium">Consommation</th>
                  <th className="px-4 py-3 font-medium">Montant total</th>
                  <th className="px-4 py-3 font-medium">Échéance</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.mainMeters.map((mm) => {
                  const periodKey = `${new Date(mm.periodStart).getFullYear()}-${String(
                    new Date(mm.periodStart).getMonth() + 1
                  ).padStart(2, "0")}`;
                  const status = statusConfig[mm.status];

                  return (
                    <tr
                      key={mm._id}
                      className="border-b border-[var(--border-color)] last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                        {mm.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {formatPeriod(periodKey)}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {mm.consumption} kWh
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                        {formatCurrency(mm.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">
                        {formatDate(mm.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {mm.status !== "allocated" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleGenerateInvoices(mm._id)}
                            isLoading={isGenerating === mm._id}
                          >
                            Générer les factures
                          </Button>
                        ) : (
                          <span className="text-xs text-[var(--foreground-muted)]">
                            Déjà réparties
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
