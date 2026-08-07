import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaColor?: "positive" | "negative" | "neutral";
  icon?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaColor = "neutral",
  icon,
}: MetricCardProps) {
  const colorMap = {
    positive: "text-positive bg-positive-light",
    negative: "text-negative bg-negative-light",
    neutral: "text-text-secondary bg-surface-container",
  };

  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-outline p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="material-symbols-outlined text-text-secondary text-lg">
            {icon}
          </span>
        )}
      </div>
      <div className="text-2xl font-semibold text-text-primary">{value}</div>
      {delta && (
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            colorMap[deltaColor]
          )}
        >
          {delta}
        </span>
      )}
    </div>
  );
}
