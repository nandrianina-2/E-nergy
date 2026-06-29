"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Building2, Users, Gauge, Wallet, ToggleLeft } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { updateOrganizationSchema } from "@/lib/validations";
import { formatCurrency } from "@/lib/utils";
import { use } from "react";

type OrgForm = z.infer<typeof updateOrganizationSchema>;

interface OrganizationDetail {
  _id: string;
  name: string;
  ownerId: { name: string; email: string; phone?: string; isActive: boolean };
  subscriptionStatus: "active" | "trial" | "suspended" | "expired";
  subscriptionExpiresAt?: string;
  monthlyFee: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

interface OrgDetailResponse {
  organization: OrganizationDetail;
  stats: {
    submetersCount: number;
    usersCount: number;
    totalInvoiced: number;
    totalPaid: number;
  };
}

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "info" | "warning" | "danger" }
> = {
  active: { label: "Actif", variant: "success" },
  trial: { label: "Essai", variant: "info" },
  suspended: { label: "Suspendu", variant: "warning" },
  expired: { label: "Expiré", variant: "danger" },
};

export default function SuperAdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useFetch<OrgDetailResponse>(
    `/api/super-admin/organizations/${id}`
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrgForm>({
    resolver: zodResolver(updateOrganizationSchema),
    values: data?.organization
      ? {
          name: data.organization.name,
          monthlyFee: data.organization.monthlyFee,
          subscriptionStatus: data.organization.subscriptionStatus,
          subscriptionExpiresAt: data.organization.subscriptionExpiresAt
            ? data.organization.subscriptionExpiresAt.slice(0, 10)
            : "",
          notes: data.organization.notes || "",
        }
      : undefined,
  });

  async function onSubmit(formData: OrgForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/super-admin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Organisation mise à jour");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleOrgActive() {
    if (!data) return;
    try {
      const res = await fetch(`/api/super-admin/organizations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !data.organization.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(
        data.organization.isActive ? "Organisation désactivée" : "Organisation réactivée"
      );
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
        Chargement…
      </div>
    );
  }

  const status = statusConfig[data.organization.subscriptionStatus];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/super-admin/organizations"
        className="flex items-center gap-1.5 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            {data.organization.name}
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Administrateur : {data.organization.ownerId?.name} (
            {data.organization.ownerId?.email})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant={data.organization.isActive ? "success" : "danger"}>
            {data.organization.isActive ? "Organisation active" : "Désactivée"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Gauge className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Sous-compteurs</p>
              <p className="font-display text-lg font-bold text-[var(--foreground)]">
                {data.stats.submetersCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[var(--accent)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Locataires</p>
              <p className="font-display text-lg font-bold text-[var(--foreground)]">
                {data.stats.usersCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[var(--info)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Total facturé</p>
              <p className="font-display text-lg font-bold text-[var(--foreground)]">
                {formatCurrency(data.stats.totalInvoiced)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[var(--success)]" />
            <div>
              <p className="text-xs text-[var(--foreground-muted)]">Total encaissé</p>
              <p className="font-display text-lg font-bold text-[var(--foreground)]">
                {formatCurrency(data.stats.totalPaid)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gestion de l'abonnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Input
              label="Nom de l'organisation"
              error={errors.name?.message}
              {...register("name")}
            />
            <Select label="Statut de l'abonnement" {...register("subscriptionStatus")}>
              <option value="trial">Essai</option>
              <option value="active">Actif</option>
              <option value="suspended">Suspendu</option>
              <option value="expired">Expiré</option>
            </Select>
            <Input
              label="Mensualité (Ar)"
              type="number"
              error={errors.monthlyFee?.message}
              {...register("monthlyFee", { valueAsNumber: true })}
            />
            <Input
              label="Date d'expiration"
              type="date"
              error={errors.subscriptionExpiresAt?.message}
              {...register("subscriptionExpiresAt")}
            />
            <div className="sm:col-span-2">
              <Input
                label="Notes internes (visibles uniquement par vous)"
                placeholder="ex: Paiement reçu par MVola le 5"
                error={errors.notes?.message}
                {...register("notes")}
              />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="submit" isLoading={isSubmitting}>
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[var(--danger)]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--danger)]">
            <ToggleLeft className="h-5 w-5" />
            Zone sensible
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--foreground-muted)]">
            {data.organization.isActive
              ? "Désactiver l'organisation bloque immédiatement l'accès de l'admin et de tous ses locataires."
              : "Réactiver l'organisation restaure l'accès de l'admin et de tous ses locataires."}
          </p>
          <Button
            variant={data.organization.isActive ? "danger" : "secondary"}
            onClick={toggleOrgActive}
          >
            {data.organization.isActive ? "Désactiver" : "Réactiver"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
