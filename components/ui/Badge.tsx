import { cn } from "@/lib/utils";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}

const variantClasses: Record<string, string> = {
  success: "bg-[var(--success)]/10 text-[var(--success)]",
  warning: "bg-[var(--warning)]/10 text-[var(--warning)]",
  danger: "bg-[var(--danger)]/10 text-[var(--danger)]",
  info: "bg-[var(--info)]/10 text-[var(--info)]",
  neutral: "bg-[var(--background-muted)] text-[var(--foreground-muted)]",
};

export function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: "unpaid" | "partial" | "paid" }) {
  const config = {
    unpaid: { variant: "danger" as const, label: "Non payé" },
    partial: { variant: "warning" as const, label: "Partiellement payé" },
    paid: { variant: "success" as const, label: "Payé" },
  };
  const { variant, label } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
