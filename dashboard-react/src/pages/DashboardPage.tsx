import { PredictiveChart } from "@/components/panels/PredictiveChart";
import { SignalDrivers } from "@/components/panels/SignalDrivers";
import { ExecutionLedger } from "@/components/panels/ExecutionLedger";
import { RiskAssessment } from "@/components/panels/RiskAssessment";
import { TomorrowsSignal } from "@/components/panels/TomorrowsSignal";
import { TrainTestSplit } from "@/components/panels/TrainTestSplit";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAllBacktestMetrics } from "@/hooks/useAllBacktestMetrics";
import { useDashboard } from "@/context/DashboardContext";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import {
  modelDisplayName,
  formatPercent,
  formatRatio,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const { ticker } = useDashboard();
  const { data: allMetrics, loading } = useAllBacktestMetrics();
  const advancedMode = useAdvancedMode();

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Hero chart - full width */}
      <PredictiveChart />

      {/* Advanced-mode panels: Next-Day Signal + Train/Test Split */}
      {advancedMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <TomorrowsSignal />
          <TrainTestSplit />
        </div>
      )}

      {/* Three-column row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        <div className="md:col-span-3">
          <SignalDrivers />
        </div>
        <div className="md:col-span-6">
          <ExecutionLedger />
        </div>
        <div className="md:col-span-3">
          <RiskAssessment />
        </div>
      </div>

      {/* Backtest Summary comparison */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary">
            Backtest Summary
          </h2>
          <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
            {ticker} &mdash; All Models
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : allMetrics.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">
            No backtest data available.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-3 px-3 md:-mx-5 md:px-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-outline text-left">
                  <th className="py-2 pr-3 font-medium text-text-secondary">
                    Model
                  </th>
                  <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                    Total Return
                  </th>
                  <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                    Ann. Return
                  </th>
                  <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                    Sharpe
                  </th>
                  <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                    Max Drawdown
                  </th>
                  <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                    Win Rate
                  </th>
                  <th className="py-2 font-medium text-text-secondary text-right">
                    Profit Factor
                  </th>
                </tr>
              </thead>
              <tbody>
                {allMetrics.map((m) => (
                  <tr
                    key={m.model}
                    className="border-b border-outline/50 last:border-0"
                  >
                    <td className="py-2 pr-3 text-text-primary font-semibold">
                      {modelDisplayName(m.model)}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-3 text-right font-medium tabular-nums",
                        m.total_return >= 0
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {formatPercent(m.total_return)}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-3 text-right font-medium tabular-nums",
                        m.annualised_return >= 0
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {formatPercent(m.annualised_return)}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-3 text-right font-medium tabular-nums",
                        m.sharpe_ratio >= 0
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {formatRatio(m.sharpe_ratio)}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums text-negative">
                      {formatPercent(m.max_drawdown)}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-3 text-right font-medium tabular-nums",
                        m.win_rate >= 0.5
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {formatPercent(m.win_rate)}
                    </td>
                    <td
                      className={cn(
                        "py-2 text-right font-medium tabular-nums",
                        m.profit_factor >= 1
                          ? "text-positive"
                          : "text-negative"
                      )}
                    >
                      {formatRatio(m.profit_factor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
