import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Récupère la session courante, lève une erreur 401 si non connecté.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("Non authentifié", 401);
  }
  return session;
}

/**
 * Vérifie que l'utilisateur connecté est admin.
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin") {
    throw new ApiError("Accès refusé : réservé aux administrateurs", 403);
  }
  return session;
}

/**
 * Vérifie qu'un utilisateur a le droit d'accéder aux données d'un sous-compteur donné.
 * Un admin peut tout voir. Un utilisateur ne peut voir que son propre sous-compteur.
 */
export function assertSubmeterAccess(
  session: { user: { role: string; submeterId?: string | null } },
  submeterId: string
) {
  if (session.user.role === "admin") return;
  if (session.user.submeterId !== submeterId) {
    throw new ApiError(
      "Accès refusé : vous ne pouvez consulter que vos propres données",
      403
    );
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("[API Error]", error);
  return NextResponse.json(
    { error: "Une erreur interne est survenue" },
    { status: 500 }
  );
}
