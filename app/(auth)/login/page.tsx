"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Zap, Mail, Lock, Eye, EyeOff, Download } from "lucide-react";
import { loginSchema } from "@/lib/validations";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { z } from "zod";

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm_() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { canInstall, promptInstall } = useInstallPrompt();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Email ou mot de passe incorrect");
        setIsLoading(false);
        return;
      }

      toast.success("Connexion réussie");
      const callbackUrl = searchParams.get("callbackUrl");
      router.push(callbackUrl || "/");
      router.refresh();
    } catch {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background-muted)] px-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl shadow-xl md:grid-cols-2">
        {/* Panneau gauche — identité visuelle */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-[#92400e] via-[#d97706] to-[#f59e0b] p-10 text-white md:flex">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <Zap className="h-6 w-6" fill="white" />
            </div>
            <span className="font-display text-xl font-bold">E-nergy</span>
          </div>

          <div>
            <h1 className="font-display text-3xl font-bold leading-tight">
              Suivez votre énergie,
              <br />
              maîtrisez vos coûts.
            </h1>
            <p className="mt-4 text-sm text-white/80">
              Compteur principal, sous-compteurs, relevés, factures et
              paiements : tout au même endroit.
            </p>
          </div>

          <div className="flex gap-1.5">
            <span className="h-1.5 w-8 rounded-full bg-white" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
          </div>
        </div>

        {/* Panneau droit — formulaire */}
        <div className="flex flex-col justify-center bg-[var(--background)] p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-2 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)]">
              <Zap className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="font-display text-lg font-bold text-[var(--foreground)]">
              E-nergy
            </span>
          </div>

          <h2 className="font-display text-2xl font-bold text-[var(--foreground)]">
            Bon retour
          </h2>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Connectez-vous pour accéder à votre espace E-nergy
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 flex flex-col gap-4"
          >
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-[var(--foreground-muted)]" />
              <Input
                label="Email"
                type="email"
                placeholder="vous@exemple.com"
                className="pl-9"
                error={errors.email?.message}
                {...register("email")}
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-[var(--foreground-muted)]" />
              <Input
                label="Mot de passe"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9 pr-9"
                error={errors.password?.message}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-[var(--foreground-muted)]"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="mt-2 w-full"
            >
              Se connecter
            </Button>
          </form>

          {canInstall && (
            <button
              onClick={promptInstall}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background-muted)]"
            >
              <Download className="h-4 w-4" />
              Installer l'application sur cet appareil
            </button>
          )}

          <p className="mt-8 text-center text-xs text-[var(--foreground-muted)]">
            Accès réservé aux comptes créés par l'administrateur.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm_ />
    </Suspense>
  );
}
