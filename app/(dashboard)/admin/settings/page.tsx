"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Camera, Loader2, Settings as SettingsIcon, Smartphone } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { updateSiteSettingsSchema, upsertPaymentMethodSchema } from "@/lib/validations";
import { ISiteSettings, IPaymentMethod, MobileMoneyOperator } from "@/types";

type SettingsForm = z.infer<typeof updateSiteSettingsSchema>;
type PaymentMethodForm = z.input<typeof upsertPaymentMethodSchema>;

const operatorLabels: Record<MobileMoneyOperator, string> = {
  mvola: "MVola",
  orange_money: "Orange Money",
  airtel_money: "Airtel Money",
};

const operatorColors: Record<MobileMoneyOperator, string> = {
  mvola: "#FFCC00",
  orange_money: "#FF6600",
  airtel_money: "#ED1C24",
};

export default function AdminSettingsPage() {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSubmittingSite, setIsSubmittingSite] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settingsData, isLoading: settingsLoading, refetch: refetchSettings } =
    useFetch<{ settings: ISiteSettings }>("/api/settings");
  const { data: methodsData, isLoading: methodsLoading, refetch: refetchMethods } =
    useFetch<{ paymentMethods: IPaymentMethod[] }>("/api/payment-methods");

  const {
    register: registerSite,
    handleSubmit: handleSubmitSite,
    formState: { errors: siteErrors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(updateSiteSettingsSchema),
    values: settingsData?.settings
      ? {
          siteName: settingsData.settings.siteName,
          supportPhone: settingsData.settings.supportPhone || "",
          supportEmail: settingsData.settings.supportEmail || "",
        }
      : undefined,
  });

  async function onSubmitSite(formData: SettingsForm) {
    setIsSubmittingSite(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Paramètres mis à jour");
      refetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmittingSite(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const sigRes = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "e-nergy/site" }),
      });
      const sigData = await sigRes.json();
      if (!sigRes.ok) throw new Error("Impossible de préparer l'upload");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("api_key", sigData.apiKey);
      formData.append("folder", sigData.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error("Échec de l'upload du logo");

      const settingsRes = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: uploadJson.secure_url }),
      });
      const settingsJson = await settingsRes.json();
      if (!settingsRes.ok) throw new Error(settingsJson.error);

      toast.success("Logo mis à jour");
      refetchSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la mise à jour du logo");
    } finally {
      setIsUploadingLogo(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Paramètres
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Identité du site et configuration des moyens de paiement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Identité du site
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <p className="text-sm text-[var(--foreground-muted)]">Chargement…</p>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {settingsData?.settings.logoUrl ? (
                    <Image
                      src={settingsData.settings.logoUrl}
                      alt="Logo"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xl font-bold text-[var(--accent)]">
                      {settingsData?.settings.siteName?.charAt(0) || "E"}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md hover:bg-[var(--accent-deep)]"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-[var(--foreground-muted)]">
                  Logo affiché dans la barre latérale et les factures
                </p>
              </div>

              <form
                onSubmit={handleSubmitSite(onSubmitSite)}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              >
                <Input
                  label="Nom du site"
                  error={siteErrors.siteName?.message}
                  {...registerSite("siteName")}
                />
                <Input
                  label="Téléphone support"
                  error={siteErrors.supportPhone?.message}
                  {...registerSite("supportPhone")}
                />
                <Input
                  label="Email support"
                  type="email"
                  error={siteErrors.supportEmail?.message}
                  {...registerSite("supportEmail")}
                />
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" isLoading={isSubmittingSite}>
                    Enregistrer
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Moyens de paiement Mobile Money
          </CardTitle>
        </CardHeader>
        <CardContent>
          {methodsLoading ? (
            <p className="text-sm text-[var(--foreground-muted)]">Chargement…</p>
          ) : (
            <div className="flex flex-col gap-4">
              {(["mvola", "orange_money", "airtel_money"] as MobileMoneyOperator[]).map(
                (operator) => {
                  const existing = methodsData?.paymentMethods.find(
                    (m) => m.operator === operator
                  );
                  return (
                    <PaymentMethodRow
                      key={operator}
                      operator={operator}
                      existing={existing}
                      onSaved={refetchMethods}
                    />
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentMethodRow({
  operator,
  existing,
  onSaved,
}: {
  operator: MobileMoneyOperator;
  existing?: IPaymentMethod;
  onSaved: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentMethodForm>({
    resolver: zodResolver(upsertPaymentMethodSchema),
    defaultValues: {
      operator,
      label: existing?.label || operatorLabels[operator],
      transferCode: existing?.transferCode || "",
      ussdTemplate: existing?.ussdTemplate || "",
      isActive: existing?.isActive ?? true,
    },
  });

  async function onSubmit(formData: PaymentMethodForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, operator }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Configuration ${operatorLabels[operator]} enregistrée`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border-color)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: operatorColors[operator] }}
          />
          <p className="font-medium text-[var(--foreground)]">
            {operatorLabels[operator]}
          </p>
        </div>
        {existing && (
          <Badge variant={existing.isActive ? "success" : "neutral"}>
            {existing.isActive ? "Actif" : "Inactif"}
          </Badge>
        )}
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Input
          label="Numéro / code marchand"
          placeholder="ex: 034 12 345 67"
          error={errors.transferCode?.message}
          {...register("transferCode")}
        />
        <Input
          label="Modèle USSD"
          placeholder="ex: *111*1*034123456*{amount}#"
          hint="Utilisez {amount} pour insérer le montant automatiquement"
          error={errors.ussdTemplate?.message}
          {...register("ussdTemplate")}
        />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
