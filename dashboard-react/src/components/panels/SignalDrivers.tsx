import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { useFeatureImportance } from "@/hooks/useFeatureImportance";
import { useMetrics } from "@/hooks/useMetrics";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMemo } from "react";

const METRIC_INFO: Record<string, { full: string; description: string }> = {
  Accuracy: {
    full: "Directional Classification Accuracy",
    description:
      "% of test days the model predicted the next-day direction (up / down) correctly. Baseline = 50%.",
  },
  F1: {
    full: "Macro-Averaged F1 Score",
    description:
      "Harmonic mean of precision and recall, averaged across up/down classes. Robust to class imbalance.",
  },
  MCC: {
    full: "Matthews Correlation Coefficient",
    description:
      "Correlation between predicted and actual labels. Ranges from –1 (worst) to +1 (perfect). MCC = 0 means random.",
  },
  "ROC AUC": {
    full: "Area Under ROC Curve",
    description:
      "Probability the model ranks a random 'up' day above a random 'down' day. 0.5 = random, 1.0 = perfect discriminator.",
  },
  "Dir. Acc.": {
    full: "Regression Directional Accuracy",
    description:
      "% of days the regression model predicted the correct sign of the log-return (different target than classification).",
  },
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const info = METRIC_INFO[row.metric];
  const valuePct = (row.value * 100).toFixed(1);
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 8,
        padding: "10px 12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        maxWidth: 240,
        fontSize: 11,
      }}
    >
      <p
        style={{
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 4,
          fontSize: 12,
        }}
      >
        {info?.full ?? row.metric}
      </p>
      <p style={{ color: "#27609d", fontWeight: 700, marginBottom: 6 }}>
        {valuePct}%
      </p>
      {info?.description && (
        <p style={{ color: "#64748b", lineHeight: 1.45, fontSize: 10.5 }}>
          {info.description}
        </p>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function SignalDrivers() {
  const { data: features, loading: fLoading } = useFeatureImportance();
  const { data: metrics, loading: mLoading } = useMetrics();

  const top15 = useMemo(() => {
    if (!features) return [];
    return features.slice(0, 15).map((f) => ({
      feature: f.feature.length > 20 ? f.feature.slice(0, 18) + ".." : f.feature,
      importance: +(f.importance * 100).toFixed(2),
      fullName: f.feature,
    }));
  }, [features]);

  const radarData = useMemo(() => {
    if (!metrics) return [];
    const t = metrics.clf_test;
    const r = metrics.reg_test;
    return [
      { metric: "Accuracy", value: t.accuracy, fullMark: 1 },
      { metric: "F1", value: t.f1_macro, fullMark: 1 },
      { metric: "MCC", value: Math.max(0, t.mcc), fullMark: 1 },
      { metric: "ROC AUC", value: t.roc_auc, fullMark: 1 },
      { metric: "Dir. Acc.", value: r.directional_accuracy, fullMark: 1 },
    ];
  }, [metrics]);

  if (fLoading || mLoading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  return (
    <Card className="flex flex-col gap-6">
      <h2 className="text-base font-semibold text-text-primary">
        Signal Drivers
      </h2>

      {/* Feature importance bars */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary mb-2">
          Top 15 Features (% importance)
        </h3>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={top15}
            layout="vertical"
            margin={{ top: 0, right: 20, bottom: 0, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 9, fill: "#64748b" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="feature"
              width={110}
              tick={{ fontSize: 9, fill: "#64748b" }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)}%`, "Importance"]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
              }}
            />
            <Bar dataKey="importance" fill="#27609d" radius={[0, 4, 4, 0]} barSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Radar chart */}
      <div>
        <h3 className="text-xs font-medium text-text-secondary mb-2">
          Model Metrics Radar
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fontSize: 10, fill: "#64748b" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1]}
              tick={{ fontSize: 8, fill: "#94a3b8" }}
              tickCount={5}
            />
            <Tooltip content={<RadarTooltip />} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#27609d"
              fill="#27609d"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
