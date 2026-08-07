import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useDashboard } from "@/context/DashboardContext";
import { useBacktestMetrics } from "@/hooks/useBacktestMetrics";
import { usePredictions } from "@/hooks/usePredictions";
import { useTrades } from "@/hooks/useTrades";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import { MetricCard } from "@/components/ui/MetricCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CostSensitivity } from "@/components/panels/CostSensitivity";
import {
  TradeHoverTooltip,
  useTradeHover,
} from "@/components/panels/TradeHoverTooltip";
import {
  modelDisplayName,
  formatPercent,
  formatRatio,
  formatDate,
  formatDateShort,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";

const METRIC_LABELS: Record<string, string> = {
  total_return: "Total Return",
  annualised_return: "Annualised Return",
  annualised_volatility: "Annualised Volatility",
  sharpe_ratio: "Sharpe Ratio",
  sortino_ratio: "Sortino Ratio",
  max_drawdown: "Max Drawdown",
  calmar_ratio: "Calmar Ratio",
  win_rate: "Win Rate",
  profit_factor: "Profit Factor",
  benchmark_return: "Benchmark Return",
  benchmark_ann_return: "Benchmark Ann. Return",
  benchmark_sharpe: "Benchmark Sharpe",
  excess_return: "Excess Return",
  information_ratio: "Information Ratio",
  total_trading_days: "Total Trading Days",
  days_in_market: "Days In Market",
  market_exposure: "Market Exposure",
};

const METRIC_TOOLTIPS: Record<string, string> = {
  total_return: "Cumulative gain/loss over the entire test period, after transaction costs.",
  annualised_return: "Total return scaled to a yearly rate, allowing comparison across different time horizons.",
  annualised_volatility: "Standard deviation of daily returns annualised (×√252). Higher = more unpredictable swings.",
  sharpe_ratio: "Risk-adjusted return: (strategy return − risk-free rate) / volatility. Above 1.0 is generally considered good.",
  sortino_ratio: "Like Sharpe but only penalises downside volatility. Higher = better downside-adjusted performance.",
  max_drawdown: "Largest peak-to-trough decline during the test period. Measures worst-case loss if entered at the peak.",
  calmar_ratio: "Annualised return / max drawdown. Higher = better return per unit of worst-case risk.",
  win_rate: "Percentage of trades that were profitable. Above 50% means more winning trades than losing ones.",
  profit_factor: "Gross profit / gross loss. Above 1.0 means the strategy made more on winners than it lost on losers.",
  benchmark_return: "Total return of the buy-and-hold SPY benchmark over the same test period.",
  benchmark_ann_return: "Annualised return of the SPY benchmark for comparison.",
  benchmark_sharpe: "Sharpe ratio of the SPY benchmark. Compare against the strategy's Sharpe.",
  excess_return: "Strategy return minus benchmark return. Positive = outperformed, negative = underperformed SPY.",
  information_ratio: "Excess return / tracking error. Measures consistency of outperformance vs the benchmark.",
  total_trading_days: "Total number of trading days in the test window.",
  days_in_market: "Number of days the strategy held a position (was not in cash).",
  market_exposure: "Percentage of trading days the strategy was invested. Lower = more time sitting in cash.",
};

function formatMetricValue(key: string, value: number | string): string {
  if (typeof value === "string") return value;
  const pctKeys = [
    "total_return",
    "annualised_return",
    "annualised_volatility",
    "max_drawdown",
    "win_rate",
    "benchmark_return",
    "benchmark_ann_return",
    "excess_return",
    "market_exposure",
  ];
  const ratioKeys = [
    "sharpe_ratio",
    "sortino_ratio",
    "calmar_ratio",
    "profit_factor",
    "benchmark_sharpe",
    "information_ratio",
  ];
  if (pctKeys.includes(key)) return formatPercent(value);
  if (ratioKeys.includes(key)) return formatRatio(value);
  if (key === "total_trading_days") return String(value);
  return String(value);
}

export function BacktestResultsPage() {
  const { model, ticker } = useDashboard();
  const { data: metrics, loading: metricsLoading } = useBacktestMetrics();
  const { data: predictions, loading: predsLoading } = usePredictions();
  const { data: trades, loading: tradesLoading } = useTrades();
  const advancedMode = useAdvancedMode();
  const { hovered, onRowEnter, onRowLeave } = useTradeHover();

  // Date→close price lookup (for tooltip's entry/exit prices)
  const priceByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!predictions) return map;
    for (const p of predictions) map.set(p.date, p.close);
    return map;
  }, [predictions]);

  // Rank by return (descending) across ALL trades
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!trades) return map;
    const sorted = [...trades]
      .map((t, i) => ({ key: `${t.entryDate}-${i}`, ret: t.return }))
      .sort((a, b) => b.ret - a.ret);
    sorted.forEach((t, i) => map.set(t.key, i + 1));
    return map;
  }, [trades]);

  const loading = metricsLoading || predsLoading || tradesLoading;

  // Compute equity curve
  const equityCurve = useMemo(() => {
    if (!predictions || predictions.length < 2) return [];

    const curve: {
      date: string;
      strategy: number;
      benchmark: number;
    }[] = [];

    let cumStrategy = 1;
    let cumBenchmark = 1;

    // First day: no return yet
    curve.push({
      date: formatDateShort(predictions[0].date),
      strategy: 1,
      benchmark: 1,
    });

    for (let i = 1; i < predictions.length; i++) {
      const prev = predictions[i - 1];
      const curr = predictions[i];
      const dailyReturn = (curr.close - prev.close) / prev.close;

      // Strategy: in market if previous day's prediction was direction=1 AND prob >= 0.55
      const inMarket =
        prev.predDirection === 1 && prev.predProbUp >= 0.55;
      const strategyReturn = inMarket ? dailyReturn : 0;

      cumStrategy *= 1 + strategyReturn;
      cumBenchmark *= 1 + dailyReturn;

      curve.push({
        date: formatDateShort(curr.date),
        strategy: cumStrategy,
        benchmark: cumBenchmark,
      });
    }

    return curve;
  }, [predictions]);

  const tickInterval = Math.max(Math.floor(equityCurve.length / 12), 1);

  // All metrics as key-value pairs for the detail table
  const metricEntries = useMemo(() => {
    if (!metrics) return [];
    const keys = Object.keys(METRIC_LABELS) as (keyof typeof METRIC_LABELS)[];
    return keys
      .filter((k) => k in metrics)
      .map((k) => ({
        key: k,
        label: METRIC_LABELS[k],
        tooltip: METRIC_TOOLTIPS[k] ?? "",
        value: formatMetricValue(
          k,
          metrics[k as keyof typeof metrics] as number | string
        ),
      }));
  }, [metrics]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">
          Backtest Results
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {modelDisplayName(model)} &mdash; {ticker}
        </p>
      </div>

      {/* Top metric cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <MetricCard
            label="Ann. Return"
            value={formatPercent(metrics.annualised_return)}
            icon="trending_up"
            deltaColor={metrics.annualised_return >= 0 ? "positive" : "negative"}
            delta={
              metrics.annualised_return >= 0 ? "Positive" : "Negative"
            }
          />
          <MetricCard
            label="Sharpe Ratio"
            value={formatRatio(metrics.sharpe_ratio)}
            icon="analytics"
            deltaColor={metrics.sharpe_ratio >= 1 ? "positive" : metrics.sharpe_ratio >= 0 ? "neutral" : "negative"}
            delta={
              metrics.sharpe_ratio >= 1
                ? "Strong"
                : metrics.sharpe_ratio >= 0
                  ? "Moderate"
                  : "Weak"
            }
          />
          <MetricCard
            label="Max Drawdown"
            value={formatPercent(metrics.max_drawdown)}
            icon="arrow_downward"
            deltaColor={metrics.max_drawdown > -0.1 ? "positive" : "negative"}
            delta={
              metrics.max_drawdown > -0.1 ? "Low Risk" : "High Risk"
            }
          />
          <MetricCard
            label="Win Rate"
            value={formatPercent(metrics.win_rate)}
            icon="emoji_events"
            deltaColor={metrics.win_rate >= 0.5 ? "positive" : "negative"}
            delta={metrics.win_rate >= 0.5 ? "Above 50%" : "Below 50%"}
          />
          <MetricCard
            label="Profit Factor"
            value={formatRatio(metrics.profit_factor)}
            icon="payments"
            deltaColor={
              metrics.profit_factor >= 1 ? "positive" : "negative"
            }
            delta={
              metrics.profit_factor >= 1 ? "Profitable" : "Unprofitable"
            }
          />
        </div>
      )}

      {/* Equity Curve */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          Equity Curve &mdash; Growth of $1
        </h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={equityCurve}
            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `$${value.toFixed(4)}`,
                name === "strategy" ? "Strategy" : "Buy & Hold",
              ]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              formatter={(value: string) =>
                value === "strategy" ? "Strategy" : "Buy & Hold"
              }
            />
            <Line
              type="monotone"
              dataKey="strategy"
              stroke="#27609d"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Trade Log */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary">
            Full Trade Log
          </h2>
          <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
            {trades?.length ?? 0} trades
          </span>
        </div>
        <div className="overflow-x-auto -mx-5 px-5 max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-outline text-left">
                <th className="py-2 pr-3 font-medium text-text-secondary">
                  #
                </th>
                <th className="py-2 pr-3 font-medium text-text-secondary">
                  Entry
                </th>
                <th className="py-2 pr-3 font-medium text-text-secondary">
                  Exit
                </th>
                <th className="py-2 pr-3 font-medium text-text-secondary text-center">
                  Days
                </th>
                <th className="py-2 pr-3 font-medium text-text-secondary text-right">
                  Return
                </th>
                <th className="py-2 font-medium text-text-secondary text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {(trades ?? []).map((trade, i) => {
                const isHovered = hovered?.index === i;
                return (
                  <tr
                    key={`${trade.entryDate}-${i}`}
                    className={cn(
                      "border-b border-outline/50 last:border-0 cursor-pointer transition-colors",
                      isHovered
                        ? "bg-primary/5"
                        : "hover:bg-surface-container-low"
                    )}
                    onMouseEnter={(e) => onRowEnter(e, i)}
                    onMouseLeave={onRowLeave}
                  >
                    <td className="py-2 pr-3 text-text-secondary">
                      {i + 1}
                    </td>
                    <td className="py-2 pr-3 text-text-primary whitespace-nowrap">
                      {formatDate(trade.entryDate)}
                    </td>
                    <td className="py-2 pr-3 text-text-primary whitespace-nowrap">
                      {formatDate(trade.exitDate)}
                    </td>
                    <td className="py-2 pr-3 text-center text-text-secondary">
                      {trade.durationDays}
                    </td>
                    <td
                      className={cn(
                        "py-2 pr-3 text-right font-medium whitespace-nowrap",
                        trade.return >= 0 ? "text-positive" : "text-negative"
                      )}
                    >
                      {trade.return >= 0 ? "+" : ""}
                      {formatPercent(trade.return)}
                    </td>
                    <td className="py-2 text-center">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-[10px] font-medium",
                          trade.profitable
                            ? "bg-positive-light text-positive"
                            : "bg-negative-light text-negative"
                        )}
                      >
                        {trade.profitable ? "WIN" : "LOSS"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Full Metrics Table */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          All Backtest Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0">
          {metricEntries.map((entry) => (
            <div
              key={entry.key}
              className="flex items-center justify-between py-2.5 border-b border-outline/50 group cursor-help"
              title={entry.tooltip}
            >
              <span className="text-xs text-text-secondary group-hover:text-primary transition-colors flex items-center gap-1">
                {entry.label}
                <span className="material-symbols-outlined text-[12px] opacity-0 group-hover:opacity-50 transition-opacity">
                  info
                </span>
              </span>
              <span className="text-xs font-medium text-text-primary tabular-nums">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Cost Sensitivity — Advanced mode only */}
      {advancedMode && <CostSensitivity />}

      {/* Trade row hover tooltip (shared with Dashboard ledger) */}
      {hovered && trades && (() => {
        const trade = trades[hovered.index];
        if (!trade) return null;
        const tradeNumber = hovered.index + 1;
        const rank = rankMap.get(`${trade.entryDate}-${hovered.index}`) ?? 0;
        return (
          <TradeHoverTooltip
            trade={trade}
            tradeNumber={tradeNumber}
            totalTrades={trades.length}
            model={model}
            ticker={ticker}
            rank={rank}
            totalRanked={trades.length}
            entryPrice={priceByDate.get(trade.entryDate) ?? null}
            exitPrice={priceByDate.get(trade.exitDate) ?? null}
            top={hovered.top}
            left={hovered.left}
          />
        );
      })()}
    </div>
  );
}
