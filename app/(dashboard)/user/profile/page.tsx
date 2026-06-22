"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Camera, Loader2, UserCircle, Lock } from "lucide-react";
import { useFetch } from "@/hooks/useFetch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations";
import { IUser } from "@/types";

type ProfileForm = z.infer<typeof updateProfileSchema>;
type PasswordForm = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { update } = useSession();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, refetch } = useFetch<{ user: IUser }>("/api/profile");

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    values: data?.user
      ? {
          name: data.user.name,
          phone: data.user.phone || "",
          email: data.user.email,
        }
      : undefined,
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmitProfile(formData: ProfileForm) {
    setIsSubmittingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      await update({ name: json.user.name });
      toast.success("Profil mis à jour");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmittingProfile(false);
    }
  }

  async function onSubmitPassword(formData: PasswordForm) {
    setIsSubmittingPassword(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success("Mot de passe modifié avec succès");
      resetPassword();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsSubmittingPassword(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const sigRes = await fetch("/api/upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "e-nergy/avatars" }),
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
      if (!uploadRes.ok) throw new Error("Échec de l'upload de l'image");

      const profileRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadJson.secure_url }),
      });
      const profileJson = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileJson.error);

      await update({ avatarUrl: uploadJson.secure_url });
      toast.success("Photo de profil mise à jour");
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Échec de la mise à jour de la photo"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center text-sm text-[var(--foreground-muted)]">
        Chargement…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--foreground)]">
          Mon profil
        </h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Gérez vos informations personnelles et votre sécurité
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative">
            {data.user.avatarUrl ? (
              <Image
                src={data.user.avatarUrl}
                alt={data.user.name}
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-soft)] text-2xl font-bold text-[var(--accent)]">
                {data.user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md hover:bg-[var(--accent-deep)]"
            >
              {isUploadingAvatar ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-display text-lg font-semibold text-[var(--foreground)]">
              {data.user.name}
            </p>
            <p className="text-sm text-[var(--foreground-muted)]">
              {data.user.email}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmitProfile(onSubmitProfile)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Input
              label="Nom complet"
              error={profileErrors.name?.message}
              {...registerProfile("name")}
            />
            <Input
              label="Email"
              type="email"
              error={profileErrors.email?.message}
              {...registerProfile("email")}
            />
            <Input
              label="Téléphone"
              error={profileErrors.phone?.message}
              {...registerProfile("phone")}
            />
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" isLoading={isSubmittingProfile}>
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Changer le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmitPassword(onSubmitPassword)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Input
              label="Mot de passe actuel"
              type="password"
              error={passwordErrors.currentPassword?.message}
              {...registerPassword("currentPassword")}
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              error={passwordErrors.newPassword?.message}
              {...registerPassword("newPassword")}
            />
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" isLoading={isSubmittingPassword}>
                Modifier le mot de passe
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
