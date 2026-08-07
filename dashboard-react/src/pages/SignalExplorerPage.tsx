import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Brush,
  Customized,
} from "recharts";
import { usePredictions } from "@/hooks/usePredictions";
import { useTrades } from "@/hooks/useTrades";
import { useDashboard } from "@/context/DashboardContext";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { modelDisplayName, formatDateShort } from "@/lib/formatters";

interface ChartDatum {
  date: string;
  rawDate: string;
  close: number;
  predPrice: number;
  confidence: number;
  logReturn: number;
  isBuy: boolean;
  isEntry: boolean;
  isExit: boolean;
  lastSignalDate: string | null;
  lastSignalPrice: number | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const datum: ChartDatum | undefined = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div
      style={{
        fontSize: 11,
        borderRadius: 8,
        border: "1px solid var(--color-outline)",
        background: "var(--color-surface)",
        padding: "8px 12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        minWidth: 160,
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4, color: "var(--color-text-primary)" }}>
        {label}
      </p>
      <p style={{ color: "var(--color-text-secondary)" }}>
        Close: <strong>${datum.close.toFixed(2)}</strong>
      </p>
      {datum.isEntry && (
        <p style={{ color: "#10b981", fontWeight: 600 }}>
          ▲ Trade Entry
        </p>
      )}
      {datum.isExit && (
        <p style={{ color: "#ef4444", fontWeight: 600 }}>
          ▼ Exit
        </p>
      )}
      {datum.isBuy && !datum.isEntry && (
        <p style={{ color: "#10b981", fontWeight: 600 }}>
          ● Buy Signal
        </p>
      )}
      {!datum.isBuy && !datum.isExit && datum.lastSignalDate ? (
        <p style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>
          Latest Signal: {formatDateShort(datum.lastSignalDate)} at $
          {datum.lastSignalPrice?.toFixed(2)}
        </p>
      ) : null}
      {!datum.isBuy && !datum.isExit && !datum.lastSignalDate && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: 10 }}>No prior signal</p>
      )}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function SignalExplorerPage() {
  const { model, ticker } = useDashboard();
  const { data: predictions, loading: predsLoading } = usePredictions();
  const { data: trades, loading: tradesLoading } = useTrades();

  const loading = predsLoading || tradesLoading;

  // Brush range state
  const [brushRange, setBrushRange] = useState<{
    startIndex: number;
    endIndex: number;
  } | null>(null);

  // Year boundary indices for vertical dashed lines
  const yearBoundaryIndices = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    const boundaries: { index: number; year: number }[] = [];
    let prevYear = new Date(predictions[0].date).getFullYear();
    for (let i = 0; i < predictions.length; i++) {
      const year = new Date(predictions[i].date).getFullYear();
      if (year !== prevYear) {
        boundaries.push({ index: i, year });
        prevYear = year;
      }
    }
    return boundaries;
  }, [predictions]);

  // Build sets of entry/exit dates from trades
  const { entryDates, exitDates } = useMemo(() => {
    const entries = new Set<string>();
    const exits = new Set<string>();
    if (trades) {
      for (const t of trades) {
        entries.add(t.entryDate);
        exits.add(t.exitDate);
      }
    }
    return { entryDates: entries, exitDates: exits };
  }, [trades]);

  const chartData = useMemo(() => {
    if (!predictions) return [];

    let lastSignalDate: string | null = null;
    let lastSignalPrice: number | null = null;

    return predictions.map((p) => {
      const isBuy = p.predDirection === 1;
      const datum: ChartDatum = {
        date: formatDateShort(p.date),
        rawDate: p.date,
        close: p.close,
        predPrice: p.predPrice,
        confidence: p.predProbUp,
        logReturn: p.predLogReturn,
        isBuy,
        isEntry: entryDates.has(p.date),
        isExit: exitDates.has(p.date),
        lastSignalDate: isBuy ? null : lastSignalDate,
        lastSignalPrice: isBuy ? null : lastSignalPrice,
      };

      if (isBuy) {
        lastSignalDate = p.date;
        lastSignalPrice = p.close;
      }

      return datum;
    });
  }, [predictions, entryDates, exitDates]);

  const handleBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number }) => {
      if (range.startIndex !== undefined && range.endIndex !== undefined) {
        setBrushRange({
          startIndex: range.startIndex,
          endIndex: range.endIndex,
        });
      }
    },
    []
  );

  const handleReset = useCallback(() => {
    setBrushRange(null);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // Determine visible data slice for confidence and return charts
  const visibleData =
    brushRange
      ? chartData.slice(brushRange.startIndex, brushRange.endIndex + 1)
      : chartData;

  const tickInterval = Math.max(Math.floor(visibleData.length / 12), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Signal Explorer
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {modelDisplayName(model)} signals for {ticker}
          </p>
        </div>
        {brushRange && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-outline bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-primary/30 transition-all"
          >
            <span className="material-symbols-outlined text-sm">
              zoom_out_map
            </span>
            Reset Zoom
          </button>
        )}
      </div>

      {/* Price chart with buy markers and entry/exit triangles + brush zoom */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-text-primary">
            Price Action &amp; Buy Signals
          </h2>
          <span className="text-[10px] text-text-secondary">
            Drag on the chart below to zoom into a date range
          </span>
        </div>
        <div id="signal-price-chart">
        <ResponsiveContainer width="100%" height={340}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 20, bottom: 30, left: 10 }}
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
              tickFormatter={(v: number) => `$${v.toFixed(0)}`}
            />
            <Tooltip content={<PriceTooltip />} />
            <Customized
              component={(props: Record<string, unknown>) => {
                const offset = props.offset as { left: number; top: number; width: number; height: number } | undefined;
                if (!offset || yearBoundaryIndices.length === 0) return null;
                const totalPoints = chartData.length;
                return (
                  <g>
                    {yearBoundaryIndices.map((b) => {
                      const x = offset.left + (b.index / (totalPoints - 1)) * offset.width;
                      return (
                        <g key={`yb-${b.year}`}>
                          <line
                            x1={x}
                            y1={offset.top}
                            x2={x}
                            y2={offset.top + offset.height}
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                          />
                          <text
                            x={x + 4}
                            y={offset.top + 14}
                            fill="#64748b"
                            fontSize={10}
                            fontWeight={600}
                          >
                            {b.year}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="close"
              name="Price"
              stroke="#27609d"
              strokeWidth={1.5}
              dot={(props: { cx: number; cy: number; index: number }) => {
                const d = chartData[props.index];
                if (!d)
                  return <circle key={props.index} r={0} cx={0} cy={0} />;

                if (d.isEntry) {
                  return (
                    <polygon
                      key={`entry-${props.index}`}
                      points={`${props.cx},${props.cy - 6} ${props.cx - 5},${props.cy + 4} ${props.cx + 5},${props.cy + 4}`}
                      fill="#10b981"
                      stroke="#059669"
                      strokeWidth={0.5}
                    />
                  );
                }
                if (d.isExit) {
                  return (
                    <polygon
                      key={`exit-${props.index}`}
                      points={`${props.cx},${props.cy + 6} ${props.cx - 5},${props.cy - 4} ${props.cx + 5},${props.cy - 4}`}
                      fill="#ef4444"
                      stroke="#dc2626"
                      strokeWidth={0.5}
                    />
                  );
                }
                if (d.isBuy) {
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill="#10b981"
                      stroke="#10b981"
                      strokeWidth={1}
                    />
                  );
                }
                return <circle key={props.index} r={0} cx={0} cy={0} />;
              }}
              activeDot={{ r: 4, fill: "#27609d" }}
            />
            <Brush
              dataKey="date"
              height={28}
              stroke="#27609d"
              fill="#f8fafc"
              travellerWidth={8}
              startIndex={brushRange?.startIndex ?? 0}
              endIndex={brushRange?.endIndex ?? chartData.length - 1}
              onChange={handleBrushChange}
              tickFormatter={() => ""}
            />
          </LineChart>
        </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 px-4">
          <span className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Price
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <span className="h-2 w-2 rounded-full bg-positive" />
            Buy Signal
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <polygon points="5,1 1,9 9,9" fill="#10b981" />
            </svg>
            Entry
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-secondary">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <polygon points="5,9 1,1 9,1" fill="#ef4444" />
            </svg>
            Exit
          </span>
        </div>
      </Card>

      {/* Prediction confidence */}
      <Card>
        <h2 className="text-base font-semibold text-text-primary mb-3">
          Prediction Confidence (P(Up))
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={visibleData}
            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: "#64748b" }}
              tickLine={false}
              interval={tickInterval}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#64748b" }}
              tickLine={false}
              domain={[0, 1]}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip
              formatter={(value: number) => [
                `${(value * 100).toFixed(1)}%`,
                "Confidence",
              ]}
              contentStyle={{
                fontSize: 11,
                borderRadius: 8,
                border: "1px solid var(--color-outline)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text-primary)",
              }}
              labelStyle={{ color: "var(--color-text-primary)" }}
              itemStyle={{ color: "var(--color-text-secondary)" }}
            />
            <ReferenceLine y={0.55} stroke="#64748b" strokeDasharray="3 3" />
            <Bar dataKey="confidence" name="P(Up)">
              {visibleData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.confidence >= 0.55 ? "#10b981" : "#cbd5e1"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Predicted log returns — hide if all values are constant (e.g. XGBoost) */}
      {(() => {
        const unique = new Set(visibleData.map((d) => d.logReturn.toFixed(6)));
        if (unique.size <= 1) return null;
        return (
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-3">
              Predicted Log Returns
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={visibleData}
                margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickLine={false}
                  interval={tickInterval}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v * 100).toFixed(2)}%`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${(value * 100).toFixed(4)}%`,
                    "Pred. Return",
                  ]}
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "1px solid var(--color-outline)",
                    backgroundColor: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                  }}
                  labelStyle={{ color: "var(--color-text-primary)" }}
                  itemStyle={{ color: "var(--color-text-secondary)" }}
                />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                <Bar dataKey="logReturn" name="Log Return">
                  {visibleData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.logReturn >= 0 ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        );
      })()}
    </div>
  );
}
