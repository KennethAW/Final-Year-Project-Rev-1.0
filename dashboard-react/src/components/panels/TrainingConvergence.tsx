import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { useTrainingHistory } from "@/hooks/useTrainingHistory";
import { useDashboard } from "@/context/DashboardContext";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { modelDisplayName } from "@/lib/formatters";

const MODELS_WITH_HISTORY = ["lstm", "patchtst"];

function SingleHistoryChart({
  task,
  title,
}: {
  task: "clf" | "reg";
  title: string;
}) {
  const { data, loading } = useTrainingHistory(task);

  if (loading) return <Skeleton className="h-56 w-full" />;
  if (!data || data.records.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-text-secondary border border-dashed border-outline rounded-lg">
        No training history for {task}
      </div>
    );
  }

  const diverged = data.final_val_loss > data.min_val_loss * 1.1;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            diverged
              ? "bg-negative-light text-negative"
              : "bg-positive-light text-positive"
          }`}
        >
          {diverged ? "Overfit detected" : "Stable convergence"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart
          data={data.records}
          margin={{ top: 5, right: 15, bottom: 5, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="epoch"
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            label={{
              value: "Epoch",
              position: "insideBottom",
              offset: -2,
              fontSize: 10,
              fill: "#64748b",
            }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            tickFormatter={(v: number) =>
              task === "clf" ? v.toFixed(2) : v.toExponential(1)
            }
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
            formatter={(value: number) => value.toFixed(5)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine
            x={data.best_epoch}
            stroke="#10b981"
            strokeDasharray="3 3"
            label={{
              value: `best @ ${data.best_epoch}`,
              position: "top",
              fontSize: 9,
              fill: "#10b981",
            }}
          />
          <Line
            type="monotone"
            dataKey="train_loss"
            name="Train"
            stroke="#27609d"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="val_loss"
            name="Validation"
            stroke="#fb5b2d"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-text-secondary">
        <span>
          Best epoch: <strong className="text-text-primary">{data.best_epoch}</strong>
        </span>
        <span>
          Min val loss:{" "}
          <strong className="text-text-primary">
            {data.min_val_loss.toFixed(4)}
          </strong>
        </span>
        <span>
          Trained epochs:{" "}
          <strong className="text-text-primary">{data.n_epochs}</strong>
        </span>
      </div>
    </div>
  );
}

export function TrainingConvergence() {
  const { model, ticker } = useDashboard();
  const hasHistory = MODELS_WITH_HISTORY.includes(model);

  return (
    <Card>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-text-primary">
          Training Convergence
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {modelDisplayName(model)} &mdash; {ticker} &middot; Train vs validation
          loss per epoch. Green line marks best validation epoch (early-stopping trigger).
        </p>
      </div>
      {!hasHistory ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
          Training loss curves are not available for {modelDisplayName(model)} &mdash;
          XGBoost is tree-based (no epochs) and TFT uses PyTorch Lightning's own
          checkpoint format. Switch to LSTM or PatchTST to inspect convergence.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SingleHistoryChart task="clf" title="Classification Loss" />
          <SingleHistoryChart task="reg" title="Regression Loss" />
        </div>
      )}
    </Card>
  );
}
