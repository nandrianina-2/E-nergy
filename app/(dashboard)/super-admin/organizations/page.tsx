"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  Plus,
  Building2,
  Users,
  Gauge,
  AlertCircle,
} from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { createOrganizationSchema } from "@/lib/validations";
import { formatCurrency, formatDate } from "@/lib/utils";

type OrgForm = z.input<typeof createOrganizationSchema>;

interface OrganizationItem {
  _id: string;
  name: string;
  ownerId: { name: string; email: string; phone?: string; isActive: boolean };
  subscriptionStatus: "active" | "trial" | "suspended" | "expired";
  subscriptionExpiresAt?: string;
  monthlyFee: number;
  isActive: boolean;
  createdAt: string;
  submetersCount: number;
  usersCount: number;
  unpaidInvoicesCount: number;
}

interface OrganizationsResponse {
  organizations: OrganizationItem[];
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

export default function SuperAdminOrganizationsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useFetch<OrganizationsResponse>(
    "/api/super-admin/organizations"
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrgForm>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { monthlyFee: 0, subscriptionStatus: "trial" },
  });

  function openModal() {
    reset({ monthlyFee: 0, subscriptionStatus: "trial" } as OrgForm);
    setIsModalOpen(true);
  }

  async function onSubmit(formData: OrgForm) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/super-admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Organisation et compte admin créés avec succès");
      setIsModalOpen(false);
      reset();
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalOrgs = data?.organizations.length || 0;
  const activeOrgs = data?.organizations.filter(
    (o) => o.subscriptionStatus === "active" || o.subscriptionStatus === "trial"
  ).length || 0;
  const monthlyRevenue =
    data?.organizations
      .filter((o) => o.subscriptionStatus === "active")
      .reduce((sum, o) => sum + o.monthlyFee, 0) || 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Organisations
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Gérez les comptes administrateurs et leurs abonnements
          </p>
        </div>
        <Button onClick={openModal}>
          <Plus className="h-4 w-4" />
          Nouvelle organisation
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--foreground-muted)]">
              Organisations
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--foreground)]">
              {totalOrgs}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--foreground-muted)]">
              Abonnements actifs
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--success)]">
              {activeOrgs}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-[var(--foreground-muted)]">
              Revenu mensuel récurrent
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-[var(--accent)]">
              {formatCurrency(monthlyRevenue)}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.organizations.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aucune organisation"
            description="Créez la première organisation pour un nouvel administrateur."
            action={
              <Button size="sm" onClick={openModal}>
                <Plus className="h-4 w-4" />
                Nouvelle organisation
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                    <th className="px-4 py-3 font-medium">Organisation</th>
                    <th className="px-4 py-3 font-medium">Administrateur</th>
                    <th className="px-4 py-3 font-medium">Locataires</th>
                    <th className="px-4 py-3 font-medium">Abonnement</th>
                    <th className="px-4 py-3 font-medium">Mensualité</th>
                    <th className="px-4 py-3 font-medium">Expire le</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.organizations.map((org) => {
                    const status = statusConfig[org.subscriptionStatus];
                    return (
                      <tr
                        key={org._id}
                        className="border-b border-[var(--border-color)] last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--foreground)]">
                            {org.name}
                          </p>
                          <p className="text-xs text-[var(--foreground-muted)]">
                            {org.submetersCount} sous-compteur(s)
                            {org.unpaidInvoicesCount > 0 && (
                              <span className="ml-1 inline-flex items-center gap-1 text-[var(--warning)]">
                                <AlertCircle className="h-3 w-3" />
                                {org.unpaidInvoicesCount} impayée(s)
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">
                          {org.ownerId?.name}
                          <p className="text-xs">{org.ownerId?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">
                          {org.usersCount}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">
                          {formatCurrency(org.monthlyFee)}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-muted)]">
                          {org.subscriptionExpiresAt
                            ? formatDate(org.subscriptionExpiresAt)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/super-admin/organizations/${org._id}`}
                            className="text-sm font-medium text-[var(--accent)] hover:underline"
                          >
                            Gérer
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 p-4 md:hidden">
              {data.organizations.map((org) => {
                const status = statusConfig[org.subscriptionStatus];
                return (
                  <Link
                    key={org._id}
                    href={`/super-admin/organizations/${org._id}`}
                    className="rounded-lg border border-[var(--border-color)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--foreground)]">
                          {org.name}
                        </p>
                        <p className="truncate text-xs text-[var(--foreground-muted)]">
                          {org.ownerId?.name} • {org.ownerId?.email}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-[var(--foreground-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        {org.submetersCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {org.usersCount}
                      </span>
                      <span>{formatCurrency(org.monthlyFee)}/mois</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nouvelle organisation"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Nom de l'organisation"
            placeholder="ex: Résidence Ambohipo"
            error={errors.organizationName?.message}
            {...register("organizationName")}
          />

          <div className="border-t border-[var(--border-color)] pt-4">
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
              Compte administrateur
            </p>
            <div className="flex flex-col gap-4">
              <Input
                label="Nom complet"
                error={errors.adminName?.message}
                {...register("adminName")}
              />
              <Input
                label="Email"
                type="email"
                error={errors.adminEmail?.message}
                {...register("adminEmail")}
              />
              <Input
                label="Mot de passe initial"
                type="text"
                hint="L'administrateur pourra le changer après connexion"
                error={errors.adminPassword?.message}
                {...register("adminPassword")}
              />
              <Input
                label="Téléphone (optionnel)"
                error={errors.adminPhone?.message}
                {...register("adminPhone")}
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-4">
            <p className="mb-3 text-sm font-medium text-[var(--foreground)]">
              Abonnement
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Statut" {...register("subscriptionStatus")}>
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
            </div>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Créer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
