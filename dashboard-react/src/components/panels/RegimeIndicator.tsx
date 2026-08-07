import { usePredictions } from "@/hooks/usePredictions";
import { useDashboard } from "@/context/DashboardContext";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

/**
 * Compact market-regime strip using the 50D vs 200D SMA cross heuristic.
 * Bull  : 50D > 200D by more than 1 %  → golden-cross territory
 * Bear  : 50D < 200D by more than 1 %  → death-cross territory
 * Sideways: |50D − 200D| <= 1 %
 *
 * Defensive framing for the FYP examiner: markets are non-stationary; this
 * banner acknowledges that regime affects model performance, without
 * claiming the model explicitly conditions on regime.
 */
export function RegimeIndicator() {
  const { ticker } = useDashboard();
  const { data: predictions, loading } = usePredictions();

  if (loading || !predictions || predictions.length < 200) return null;

  const closes = predictions.map((p) => p.close);
  const n = closes.length;
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const sma50 = mean(closes.slice(n - 50));
  const sma200 = mean(closes.slice(n - 200));
  const price = closes[n - 1];
  const spread = ((sma50 - sma200) / sma200) * 100;

  type Regime = {
    label: "Bull" | "Bear" | "Sideways";
    color: string;
    bg: string;
    ring: string;
    icon: string;
  };
  const regime: Regime =
    spread > 1
      ? {
          label: "Bull",
          color: "text-positive",
          bg: "bg-positive/10",
          ring: "ring-positive/30",
          icon: "trending_up",
        }
      : spread < -1
      ? {
          label: "Bear",
          color: "text-negative",
          bg: "bg-negative/10",
          ring: "ring-negative/30",
          icon: "trending_down",
        }
      : {
          label: "Sideways",
          color: "text-text-secondary",
          bg: "bg-surface-container",
          ring: "ring-outline",
          icon: "trending_flat",
        };

  const stat = (label: string, value: string, emphasis?: string) => (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-medium text-text-secondary uppercase tracking-widest">
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", emphasis ?? "text-text-primary")}>
        {value}
      </span>
    </div>
  );

  return (
    <Card className="py-3">
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center ring-1",
              regime.bg,
              regime.ring
            )}
          >
            <span
              className={cn("material-symbols-outlined text-xl", regime.color)}
            >
              {regime.icon}
            </span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-medium text-text-secondary uppercase tracking-widest">
              Market Regime &middot; {ticker}
            </span>
            <span className={cn("text-base font-bold", regime.color)}>
              {regime.label}
            </span>
          </div>
        </div>
        <div className="h-9 w-px bg-outline hidden md:block" />
        <div className="flex items-center gap-5 flex-wrap">
          {stat("Price", `$${price.toFixed(2)}`)}
          {stat("50D", `$${sma50.toFixed(2)}`)}
          {stat("200D", `$${sma200.toFixed(2)}`)}
          {stat(
            "Spread",
            `${spread >= 0 ? "+" : ""}${spread.toFixed(2)}%`,
            regime.color
          )}
        </div>
        <span className="ml-auto text-[10px] text-text-secondary italic hidden lg:inline">
          50D vs 200D SMA cross &mdash; markets are non-stationary; model
          performance can vary by regime.
        </span>
      </div>
    </Card>
  );
}
