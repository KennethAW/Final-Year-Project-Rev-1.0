import { usePredictions } from "@/hooks/usePredictions";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useDashboard } from "@/context/DashboardContext";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { modelDisplayName } from "@/lib/formatters";
import { cn } from "@/lib/utils";

/**
 * Compact "latest model output" panel. Reads the final row of the predictions
 * array (most recent test-set prediction) and renders it as a live-feeling
 * next-day signal card: direction + expected return + confidence.
 *
 * Demo framing: transforms the dashboard from "historical results viewer" into
 * "live ML system" — answers the examiner's likely "so what does this actually
 * do in production?" by showing a concrete, current signal.
 */
/**
 * Classify the current market regime via the 50D vs 200D SMA cross heuristic.
 * Bull: 50D > 200D by more than 1% · Bear: 50D < 200D by more than 1% · else Sideways.
 * Returns null if there isn't enough history (< 200 bars) to compute the 200D SMA.
 */
function useRegime(closes: number[]) {
  if (closes.length < 200) return null;
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const sma50 = mean(closes.slice(-50));
  const sma200 = mean(closes.slice(-200));
  const spread = ((sma50 - sma200) / sma200) * 100;
  if (spread > 1) return { label: "Bull" as const, spread, icon: "trending_up", color: "text-positive", bg: "bg-positive/10", ring: "ring-positive/30" };
  if (spread < -1) return { label: "Bear" as const, spread, icon: "trending_down", color: "text-negative", bg: "bg-negative/10", ring: "ring-negative/30" };
  return { label: "Sideways" as const, spread, icon: "trending_flat", color: "text-text-secondary", bg: "bg-surface-container", ring: "ring-outline" };
}

export function TomorrowsSignal() {
  const { model, ticker } = useDashboard();
  const { data: predictions, loading } = usePredictions();
  const { data: history } = usePriceHistory();

  // Regime is a market-wide signal — compute it on the full price history
  // (train+val+test) so the 50D/200D SMAs reflect today's regime, not only
  // the trailing test-window averages.
  const regime = useRegime(history?.map((b) => b.close) ?? []);

  if (loading) {
    return <Skeleton className="h-[220px] w-full" />;
  }
  if (!predictions || predictions.length === 0) {
    return null;
  }

  const latest = predictions[predictions.length - 1];
  const isLong = latest.predDirection > 0;
  const direction = isLong ? "LONG" : "SHORT";
  const confidence = isLong ? latest.predProbUp : 1 - latest.predProbUp;
  const expectedPct = (Math.exp(latest.predLogReturn) - 1) * 100;

  return (
    <Card className="h-full flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-primary">
            Next-Day Signal
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2 flex-wrap">
            <span>
              {modelDisplayName(model)} &middot; {ticker}
            </span>
            {regime && (
              <>
                <span className="text-outline">|</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 ring-1",
                    regime.bg,
                    regime.ring
                  )}
                  title={`50D/200D SMA spread: ${regime.spread >= 0 ? "+" : ""}${regime.spread.toFixed(2)}% — markets are non-stationary; regime affects model performance.`}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[13px]",
                      regime.color
                    )}
                  >
                    {regime.icon}
                  </span>
                  <span className={cn("font-semibold", regime.color)}>
                    {regime.label}
                  </span>
                  <span className="text-text-secondary tabular-nums">
                    {regime.spread >= 0 ? "+" : ""}
                    {regime.spread.toFixed(2)}%
                  </span>
                </span>
              </>
            )}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-container px-2.5 py-0.5 text-[10px] font-medium text-text-secondary tracking-wider">
          As of {latest.date}
        </span>
      </div>

      {/* Direction + expected move */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "rounded-lg px-4 py-2.5 flex flex-col items-center min-w-[90px]",
            isLong
              ? "bg-positive/10 ring-1 ring-positive/30"
              : "bg-negative/10 ring-1 ring-negative/30"
          )}
        >
          <span
            className={cn(
              "text-2xl font-bold tracking-wider",
              isLong ? "text-positive" : "text-negative"
            )}
          >
            {direction}
          </span>
          <span className="text-[9px] font-medium text-text-secondary uppercase tracking-widest mt-0.5">
            Signal
          </span>
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-widest">
            Expected Return
          </span>
          <span
            className={cn(
              "text-xl font-bold tabular-nums",
              expectedPct >= 0 ? "text-positive" : "text-negative"
            )}
          >
            {expectedPct >= 0 ? "+" : ""}
            {expectedPct.toFixed(2)}%
          </span>
          <span className="text-[10px] text-text-secondary tabular-nums mt-0.5">
            ${latest.close.toFixed(2)} &rarr; ${latest.predPrice.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Confidence meter */}
      <div className="pt-2 border-t border-outline">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-text-secondary uppercase tracking-widest">
            Confidence
          </span>
          <span className="text-xs font-semibold text-text-primary tabular-nums">
            {(confidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isLong ? "bg-positive" : "bg-negative"
            )}
            style={{ width: `${Math.min(confidence * 100, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-text-secondary mt-1.5 leading-snug">
          P(up) = {(latest.predProbUp * 100).toFixed(1)}%. Model output is a
          next-day directional + regression forecast; not an order.
        </p>
      </div>
    </Card>
  );
}
