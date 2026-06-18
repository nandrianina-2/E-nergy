import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
}

export function StatCard({ label, value, icon: Icon, trend, accentColor }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--foreground-muted)]">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-[var(--foreground)]">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                trend.positive ? "text-[var(--success)]" : "text-[var(--danger)]"
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: accentColor || "var(--accent-soft)" }}
        >
          <Icon className="h-5 w-5" style={{ color: "var(--accent)" }} />
        </div>
      </div>
    </div>
  );
}
