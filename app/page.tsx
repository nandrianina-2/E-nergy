export default function Home() {
  // Cette page n'est jamais affichée : le proxy redirige systématiquement
  // vers /login ou /admin/dashboard ou /user/dashboard selon l'état de connexion.
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background-muted)]">
      <p className="text-sm text-[var(--foreground-muted)]">Chargement…</p>
    </div>
  );
}
