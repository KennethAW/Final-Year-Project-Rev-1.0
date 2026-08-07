import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useBacktestMetrics } from "@/hooks/useBacktestMetrics";
import { Card } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPercent, formatRatio } from "@/lib/formatters";

const SECTOR_DATA = [
  { name: "Technology", value: 60, color: "#27609d" },
  { name: "Financials", value: 20, color: "#fb5b2d" },
  { name: "Energy", value: 20, color: "#10b981" },
];

export function RiskAssessment() {
  const { data: bt, loading } = useBacktestMetrics();

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  if (!bt) return null;

  const metrics = [
    {
      label: "Sharpe Ratio",
      value: formatRatio(bt.sharpe_ratio),
      delta: bt.sharpe_ratio >= 0 ? "Positive" : "Negative",
      deltaColor: bt.sharpe_ratio >= 0 ? "positive" as const : "negative" as const,
      icon: "show_chart",
    },
    {
      label: "Max Drawdown",
      value: formatPercent(bt.max_drawdown),
      delta: bt.max_drawdown > -0.1 ? "Low Risk" : "High Risk",
      deltaColor: bt.max_drawdown > -0.1 ? "positive" as const : "negative" as const,
      icon: "trending_down",
    },
    {
      label: "Win Rate",
      value: formatPercent(bt.win_rate),
      delta: bt.win_rate >= 0.5 ? "Above 50%" : "Below 50%",
      deltaColor: bt.win_rate >= 0.5 ? "positive" as const : "negative" as const,
      icon: "emoji_events",
    },
    {
      label: "Profit Factor",
      value: formatRatio(bt.profit_factor),
      delta: bt.profit_factor >= 1 ? "Profitable" : "Unprofitable",
      deltaColor: bt.profit_factor >= 1 ? "positive" as const : "negative" as const,
      icon: "payments",
    },
    {
      label: "Market Exposure",
      value: formatPercent(bt.market_exposure),
      deltaColor: "neutral" as const,
      icon: "pie_chart",
    },
    {
      label: "Total Return",
      value: formatPercent(bt.total_return),
      delta: bt.total_return >= 0 ? "Gain" : "Loss",
      deltaColor: bt.total_return >= 0 ? "positive" as const : "negative" as const,
      icon: "account_balance_wallet",
    },
  ];

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-text-primary">
        Risk Assessment
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Sector donut */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary mb-2">
          Sector Allocation
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={SECTOR_DATA}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {SECTOR_DATA.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [`${value}%`, name]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-4 mt-1">
          {SECTOR_DATA.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-[10px] text-text-secondary">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.name} ({s.value}%)
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
