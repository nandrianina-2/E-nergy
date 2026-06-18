"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Plus, Search, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { createUserSchema } from "@/lib/validations";
import { IUser, ISubmeter } from "@/types";

type UserForm = z.input<typeof createUserSchema>;

interface UsersResponse {
  users: IUser[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

interface SubmetersResponse {
  submeters: ISubmeter[];
}

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useFetch<UsersResponse>(
    `/api/users?page=${page}&search=${encodeURIComponent(search)}`,
    [page, search]
  );

  const { data: submetersData } = useFetch<SubmetersResponse>(
    "/api/submeters?limit=100"
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserForm>({
    resolver: zodResolver(createUserSchema),
  });

  function openCreateModal() {
    setEditingUser(null);
    reset({ role: "user", language: "fr" } as UserForm);
    setIsModalOpen(true);
  }

  function openEditModal(user: IUser) {
    setEditingUser(user);
    reset({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      submeterId:
        typeof user.submeterId === "object"
          ? user.submeterId?._id
          : user.submeterId || "",
      language: user.language,
      password: "placeholder123", // non utilisé en édition mais requis par le schéma de création
    } as UserForm);
    setIsModalOpen(true);
  }

  async function onSubmit(formData: UserForm) {
    setIsSubmitting(true);
    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      const payload = editingUser
        ? {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            role: formData.role,
            submeterId: formData.submeterId || null,
          }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(editingUser ? "Utilisateur mis à jour" : "Utilisateur créé");
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(user: IUser) {
    if (!confirm(`Supprimer l'utilisateur ${user.name} ?`)) return;
    try {
      const res = await fetch(`/api/users/${user._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Utilisateur supprimé");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  async function toggleActive(user: IUser) {
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(user.isActive ? "Compte désactivé" : "Compte activé");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    }
  }

  const availableSubmeters = (submetersData?.submeters || []).filter(
    (s) =>
      !s.userId ||
      (typeof s.userId === "object" && s.userId._id === editingUser?._id) ||
      s._id ===
        (typeof editingUser?.submeterId === "object"
          ? editingUser?.submeterId?._id
          : editingUser?.submeterId)
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Utilisateurs
          </h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Gérez les comptes administrateurs et utilisateurs
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Ajouter un utilisateur
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
              placeholder="Rechercher par nom ou email…"
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] py-2 pl-9 pr-3 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
            Chargement…
          </div>
        ) : !data || data.users.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Aucun utilisateur trouvé"
            description="Ajoutez votre premier utilisateur pour commencer."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-left text-[var(--foreground-muted)]">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Sous-compteur</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr
                    key={user._id}
                    className="border-b border-[var(--border-color)] last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "admin" ? "info" : "neutral"}>
                        {user.role === "admin" ? "Administrateur" : "Utilisateur"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground-muted)]">
                      {typeof user.submeterId === "object" && user.submeterId
                        ? `${user.submeterId.label} (${user.submeterId.code})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(user)}>
                        <Badge variant={user.isActive ? "success" : "danger"}>
                          {user.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-lg p-2 text-[var(--foreground-muted)] hover:bg-[var(--background-muted)]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
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
        title={editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Nom complet"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register("email")}
          />
          {!editingUser && (
            <Input
              label="Mot de passe"
              type="password"
              error={errors.password?.message}
              {...register("password")}
            />
          )}
          <Input
            label="Téléphone (optionnel)"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Select label="Rôle" {...register("role")}>
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </Select>
          <Select label="Sous-compteur assigné (optionnel)" {...register("submeterId")}>
            <option value="">Aucun</option>
            {availableSubmeters.map((s) => (
              <option key={s._id} value={s._id}>
                {s.label} ({s.code})
              </option>
            ))}
          </Select>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingUser ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
