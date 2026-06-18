import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--background-muted)]">
        <Icon className="h-7 w-7 text-[var(--foreground-muted)]" />
      </div>
      <p className="font-display text-base font-semibold text-[var(--foreground)]">
        {title}
      </p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--foreground-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
