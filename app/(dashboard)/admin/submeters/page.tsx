"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Search, Pencil, Trash2, Gauge } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { createSubmeterSchema } from "@/lib/validations";
import { ISubmeter } from "@/types";

type SubmeterForm = z.input<typeof createSubmeterSchema>;

interface SubmetersResponse {
  submeters: ISubmeter[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export default function AdminSubmetersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubmeter, setEditingSubmeter] = useState<ISubmeter | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useFetch<SubmetersResponse>(
    `/api/submeters?page=${page}&search=${encodeURIComponent(search)}`,
    [page, search]
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubmeterForm>({
    resolver: zodResolver(createSubmeterSchema),
  });

  function openCreateModal() {
    setEditingSubmeter(null);
    reset({ code: "", label: "", initialIndex: 0 });
    setIsModalOpen(true);
  }

  function openEditModal(submeter: ISubmeter) {
    setEditingSubmeter(submeter);
    reset({
      code: submeter.code,
      label: submeter.label,
      initialIndex: submeter.initialIndex,
    });
    setIsModalOpen(true);
  }

  async function onSubmit(formData: SubmeterForm) {
    setIsSubmitting(true);
    try {
      const url = editingSubmeter
        ? `/api/submeters/${editingSubmeter._id}`
        : "/api/submeters";
      const method = editingSubmeter ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(
        editingSubmeter ? "Sous-compteur mis à jour" : "Sous-compteur créé"
      );
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(submeter: ISubmeter) {
    if (!confirm(`Supprimer le sous-compteur ${submeter.label} ?`)) return;
    try {
      const res = await fetch(`/api/submeters/${submeter._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Sous-compteur supprimé");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  async function toggleActive(submeter: ISubmeter) {
    try {
      const res = await fetch(`/api/submeters/${submeter._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !submeter.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Sous-compteurs
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Gérez les sous-compteurs et leur affectation
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Ajouter un sous-compteur
        </Button>
      </div>

      <Card>
        <div className="border-b border-[var(--border-color)] p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--foreground-muted)]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher par code ou libellé…"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.submeters.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title="Aucun sous-compteur"
            description="Ajoutez votre premier sous-compteur pour commencer."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Libellé</th>
                  <th className="px-4 py-3 font-medium">Utilisateur</th>
                  <th className="px-4 py-3 font-medium">Index initial</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.submeters.map((submeter) => (
                  <tr
                    key={submeter._id}
                    className="border-b border-[var(--border-color)] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-[var(--foreground)]">
                      {submeter.code}
                    </td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {submeter.label}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {typeof submeter.userId === "object" && submeter.userId
                        ? submeter.userId.name
                        : "Non assigné"}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {submeter.initialIndex} kWh
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(submeter)}>
                        <Badge variant={submeter.isActive ? "success" : "danger"}>
                          {submeter.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(submeter)}
                          className="rounded-lg p-2 text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(submeter)}
                          className="rounded-lg p-2 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSubmeter ? "Modifier le sous-compteur" : "Ajouter un sous-compteur"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Code (ex: SM-001)"
            error={errors.code?.message}
            {...register("code")}
          />
          <Input
            label="Libellé (ex: Appartement 1)"
            error={errors.label?.message}
            {...register("label")}
          />
          <Input
            label="Index initial (kWh)"
            type="number"
            step="0.01"
            error={errors.initialIndex?.message}
            {...register("initialIndex", { valueAsNumber: true })}
          />

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingSubmeter ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
