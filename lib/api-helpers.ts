import { auth } from "@/lib/auth/config";
import { NextResponse, NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Organization } from "@/lib/models";

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
 * Vérifie que l'utilisateur connecté est admin OU super_admin (le super_admin
 * hérite de tous les droits admin, plus la supervision transversale).
 */
export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "admin" && session.user.role !== "super_admin") {
    throw new ApiError("Accès refusé : réservé aux administrateurs", 403);
  }
  return session;
}

/**
 * Vérifie que l'utilisateur connecté est précisément le super_admin
 * (supervision globale de toutes les organisations, gestion des abonnements).
 */
export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "super_admin") {
    throw new ApiError("Accès réservé à l'administrateur principal", 403);
  }
  return session;
}

/**
 * Détermine l'organizationId à utiliser pour scoper une requête.
 *
 * - admin / user : toujours leur propre organizationId, jamais négociable.
 * - super_admin : par défaut aucune restriction (voit tout), sauf s'il précise
 *   explicitement ?organizationId=... dans l'URL pour consulter une organisation
 *   précise (utile pour le débogage ou l'assistance à un admin).
 *
 * Retourne `null` uniquement quand le super_admin veut une vue transversale
 * (aucun filtre organizationId à appliquer) — les routes doivent alors gérer
 * ce cas explicitement plutôt que de l'ignorer par accident.
 */
export async function requireOrgScope(
  req?: NextRequest | Request
): Promise<{ session: Awaited<ReturnType<typeof requireAuth>>; organizationId: string | null }> {
  const session = await requireAuth();

  if (session.user.role === "super_admin") {
    const url = req ? new URL(req.url) : null;
    const requestedOrgId = url?.searchParams.get("organizationId");
    return { session, organizationId: requestedOrgId || null };
  }

  if (!session.user.organizationId) {
    throw new ApiError(
      "Votre compte n'est rattaché à aucune organisation. Contactez l'administrateur principal.",
      403
    );
  }

  return { session, organizationId: session.user.organizationId };
}

/**
 * Variante stricte : exige un organizationId concret, y compris pour le
 * super_admin (utilisée par les routes de création où on ne peut pas se
 * permettre une absence de filtre, ex: créer un sous-compteur).
 */
export async function requireOrgScopeStrict(
  req?: NextRequest | Request
): Promise<{ session: Awaited<ReturnType<typeof requireAuth>>; organizationId: string }> {
  const { session, organizationId } = await requireOrgScope(req);
  if (!organizationId) {
    throw new ApiError(
      "Précisez une organisation cible (paramètre organizationId requis pour cette action)",
      400
    );
  }
  return { session, organizationId };
}

/**
 * Vérifie que l'abonnement de l'organisation est actif (ou en essai).
 * Bloque l'accès si suspendu ou expiré. Le super_admin n'est jamais concerné.
 */
export async function requireActiveSubscription(organizationId: string) {
  await connectDB();
  const org = await Organization.findById(organizationId);
  if (!org || !org.isActive) {
    throw new ApiError("Organisation introuvable ou désactivée", 403);
  }
  if (org.subscriptionStatus === "suspended" || org.subscriptionStatus === "expired") {
    throw new ApiError(
      "L'abonnement de votre organisation est suspendu ou expiré. Contactez l'administrateur principal pour le réactiver.",
      402
    );
  }
  return org;
}

/**
 * Vérifie qu'un utilisateur a le droit d'accéder aux données d'un sous-compteur donné.
 * Un admin/super_admin peut tout voir dans son périmètre. Un utilisateur ne peut
 * voir que son propre sous-compteur.
 */
export function assertSubmeterAccess(
  session: { user: { role: string; submeterId?: string | null } },
  submeterId: string
) {
  if (session.user.role === "admin" || session.user.role === "super_admin") return;
  if (session.user.submeterId !== submeterId) {
    throw new ApiError(
      "Accès refusé : vous ne pouvez consulter que vos propres données",
      403
    );
  }
}

/**
 * Vérifie qu'un document appartenant à une organisation est bien accessible
 * par la session courante. Un admin ne peut accéder qu'aux documents de sa
 * propre organisation ; le super_admin n'a aucune restriction.
 */
export function assertOrgAccess(
  session: { user: { role: string; organizationId?: string | null } },
  documentOrganizationId: string,
  notFoundMessage = "Ressource introuvable"
) {
  if (session.user.role === "super_admin") return;
  if (session.user.organizationId !== documentOrganizationId) {
    throw new ApiError(notFoundMessage, 404);
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

/**
 * Vérifie que la requête provient bien de Vercel Cron (via CRON_SECRET) OU
 * d'un admin authentifié qui déclenche manuellement la tâche depuis l'interface
 * (utile pour tester ou forcer une relance immédiate).
 */
export async function requireCronSecretOrAdmin(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return; // appel légitime de Vercel Cron
  }

  // Sinon, on retombe sur la vérification de session admin classique
  await requireAdmin();
}
