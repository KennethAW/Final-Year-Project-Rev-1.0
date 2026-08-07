import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Customized,
} from "recharts";
import { usePredictions } from "@/hooks/usePredictions";
import { useMetrics } from "@/hooks/useMetrics";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { useDashboard } from "@/context/DashboardContext";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import { TICKER_EVENTS, MACRO_EVENTS } from "@/lib/chartAnnotations";
import { modelDisplayName, formatDateShort, formatPercent } from "@/lib/formatters";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface ChartPayloadEntry {
  color?: string;
  name?: string;
  value?: number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-outline bg-white/95 backdrop-blur-sm p-3 shadow-lg text-xs">
      <p className="font-medium text-text-primary mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="font-medium text-text-primary">
            ${entry.value?.toFixed(2)}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Compute a simple moving average of length `window` over `values`. */
function computeSMA(values: number[], window: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - window + 1; j <= i; j++) sum += values[j];
      result.push(sum / window);
    }
  }
  return result;
}

export function PredictiveChart() {
  const { model, ticker } = useDashboard();
  const { data: predictions, loading: pLoading } = usePredictions();
  const { data: metrics, loading: mLoading } = useMetrics();
  const { data: priceHistory } = usePriceHistory();
  const advancedMode = useAdvancedMode();

  const chartData = useMemo(() => {
    if (!predictions) return [];
    return predictions.map((p, i) => ({
      date: formatDateShort(p.date),
      rawDate: p.date,
      actual: p.close,
      predicted: p.predPrice,
      idx: i,
    }));
  }, [predictions]);

  // Compute SMA overlays + ±1 std band from the full price history
  const smaData = useMemo(() => {
    if (!priceHistory || !predictions || priceHistory.length < 200) return null;

    const closes = priceHistory.map((b) => b.close);
    const sma50Raw = computeSMA(closes, 50);
    const sma200Raw = computeSMA(closes, 200);

    // Compute rolling 20-day std for ±1σ band around actual price
    const overlayByDate: Record<string, { sma50: number | null; sma200: number | null; bandUpper: number | null; bandLower: number | null }> = {};
    for (let i = 0; i < priceHistory.length; i++) {
      let bandUpper: number | null = null;
      let bandLower: number | null = null;
      if (i >= 19) {
        const slice = closes.slice(i - 19, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / 20;
        const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20;
        const std = Math.sqrt(variance);
        bandUpper = closes[i] + std;
        bandLower = closes[i] - std;
      }
      overlayByDate[priceHistory[i].date] = {
        sma50: sma50Raw[i],
        sma200: sma200Raw[i],
        bandUpper,
        bandLower,
      };
    }

    // Map onto chartData using rawDate matching
    return predictions.map((p) => {
      const entry = overlayByDate[p.date];
      return {
        sma50: entry?.sma50 ?? null,
        sma200: entry?.sma200 ?? null,
        bandUpper: entry?.bandUpper ?? null,
        bandLower: entry?.bandLower ?? null,
      };
    });
  }, [priceHistory, predictions]);

  // Merge SMA + band data only in advanced mode
  const enrichedChartData = useMemo(() => {
    if (!advancedMode || !smaData) return chartData;
    return chartData.map((d, i) => ({
      ...d,
      sma50: smaData[i]?.sma50 ?? undefined,
      sma200: smaData[i]?.sma200 ?? undefined,
      bandUpper: smaData[i]?.bandUpper ?? undefined,
      bandLower: smaData[i]?.bandLower ?? undefined,
    }));
  }, [chartData, smaData, advancedMode]);

  // Collect event annotations that fall within the chart date range
  const eventAnnotations = useMemo(() => {
    if (!advancedMode || !predictions || predictions.length === 0) return [];

    const chartDates = new Set(predictions.map((p) => p.date));
    const tickerEvents = TICKER_EVENTS[ticker] ?? [];
    const allEvents = [...tickerEvents, ...MACRO_EVENTS];

    return allEvents
      .filter((e) => chartDates.has(e.date))
      .map((e) => ({
        ...e,
        index: predictions.findIndex((p) => p.date === e.date),
      }))
      .filter((e) => e.index >= 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [advancedMode, predictions, ticker]);

  // Find year boundary indices for custom rendering
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

  const [hoveredEventIndex, setHoveredEventIndex] = useState<number | null>(null);

  if (pLoading || mLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const dirAccuracy = metrics?.reg_test?.directional_accuracy;

  return (
    <Card className="col-span-full">
      <div className="mb-3 md:mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm md:text-base font-semibold text-text-primary">
            Predictive Analytics Overlay
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            {modelDisplayName(model)} &mdash; {ticker}
          </p>
        </div>
        {dirAccuracy != null && (
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span className="rounded-full bg-tertiary/10 px-2 md:px-3 py-1 text-xs md:text-sm font-bold text-tertiary">
              {formatPercent(dirAccuracy, 1)}
            </span>
            <span className="text-[10px] text-text-secondary whitespace-nowrap">
              Dir. Accuracy
            </span>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={advancedMode ? 340 : 310} className="md:!h-[360px]">
        <ComposedChart data={enrichedChartData} margin={{ top: 0, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: "#64748b" }}
            tickLine={false}
            interval={Math.max(Math.floor(enrichedChartData.length / 8), 1)}
            angle={-30}
            textAnchor="end"
            height={45}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#64748b" }}
            tickLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            height={24}
            content={() => (
              <div className="flex items-center justify-center gap-4 flex-wrap text-[11px]">
                {/* Actual Price — solid line */}
                <span className="flex items-center gap-1.5">
                  <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#27609d" strokeWidth={2} /></svg>
                  <span className="text-text-secondary">Actual Price</span>
                </span>
                {/* ML Forecast — dashed line */}
                <span className="flex items-center gap-1.5">
                  <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#fb5b2d" strokeWidth={1.5} strokeDasharray="6 3" /></svg>
                  <span className="text-text-secondary">ML Forecast</span>
                </span>
                {/* Advanced-only legend items */}
                {advancedMode && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#10b981" strokeWidth={1} strokeDasharray="4 2" /></svg>
                      <span className="text-text-secondary">50D SMA</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg width="24" height="10"><line x1="0" y1="5" x2="24" y2="5" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="4 2" /></svg>
                      <span className="text-text-secondary">200D SMA</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg width="24" height="14"><rect x="0" y="2" width="24" height="10" rx="2" fill="#27609d" fillOpacity={0.1} stroke="#27609d" strokeOpacity={0.3} strokeWidth={0.5} /></svg>
                      <span className="text-text-secondary">±1σ Band</span>
                    </span>
                  </>
                )}
              </div>
            )}
          />

          {/* Year boundaries, ±1σ band, event annotations */}
          <Customized
            component={(props: Record<string, unknown>) => {
              const offset = props.offset as { left: number; top: number; width: number; height: number } | undefined;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const yAxisMap = props.yAxisMap as Record<string, any> | undefined;
              if (!offset) return null;
              const totalPoints = enrichedChartData.length;
              if (totalPoints < 2) return null;

              // Y-axis scale for converting price values to pixel positions
              const yAxis = yAxisMap ? Object.values(yAxisMap)[0] : null;
              const yScale = yAxis?.scale as ((v: number) => number) | undefined;

              return (
                <g>
                  {/* ±1σ band — SVG path between upper and lower */}
                  {advancedMode && yScale && (() => {
                    const points: { x: number; upper: number; lower: number }[] = [];
                    for (let i = 0; i < totalPoints; i++) {
                      const d = enrichedChartData[i];
                      if (d.bandUpper != null && d.bandLower != null) {
                        const x = offset.left + (i / (totalPoints - 1)) * offset.width;
                        points.push({ x, upper: yScale(d.bandUpper), lower: yScale(d.bandLower) });
                      }
                    }
                    if (points.length < 2) return null;
                    const upperPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.upper}`).join(" ");
                    const lowerPath = [...points].reverse().map((p) => `L${p.x},${p.lower}`).join(" ");
                    return (
                      <path
                        d={`${upperPath} ${lowerPath} Z`}
                        fill="#27609d"
                        fillOpacity={0.08}
                        stroke="none"
                      />
                    );
                  })()}

                  {/* Year boundary lines */}
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

                  {/* Hovered event highlight line */}
                  {hoveredEventIndex !== null && (() => {
                    const evt = eventAnnotations.find((e) => e.index === hoveredEventIndex);
                    if (!evt) return null;
                    const x = offset.left + (evt.index / (totalPoints - 1)) * offset.width;
                    const color = evt.type === "earnings" ? "#fb5b2d" : evt.type === "news" ? "#0ea5e9" : "#8b5cf6";
                    return (
                      <g>
                        <line
                          x1={x}
                          y1={offset.top}
                          x2={x}
                          y2={offset.top + offset.height}
                          stroke={color}
                          strokeWidth={2}
                        />
                        <text
                          x={x + 4}
                          y={offset.top + 14}
                          fill={color}
                          fontSize={10}
                          fontWeight={600}
                        >
                          {evt.label}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            }}
          />

          <Line
            type="monotone"
            dataKey="actual"
            name="Actual Price"
            stroke="#27609d"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#27609d" }}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            name="ML Forecast"
            stroke="#fb5b2d"
            strokeWidth={1.5}
            strokeDasharray="8 4"
            dot={false}
            activeDot={{ r: 4, fill: "#fb5b2d" }}
            legendType="none"
          />

          {/* SMA overlays — always in the tree, hidden until data loads */}
          <Line
            type="monotone"
            dataKey="sma50"
            name="50D SMA"
            stroke="#10b981"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
            connectNulls={false}
            hide={!advancedMode || !smaData}
            legendType="none"
          />
          <Line
            type="monotone"
            dataKey="sma200"
            name="200D SMA"
            stroke="#8b5cf6"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
            connectNulls={false}
            hide={!advancedMode || !smaData}
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Event timeline strip — advanced mode */}
      {advancedMode && eventAnnotations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-outline">
          <p className="text-[10px] font-medium text-text-secondary uppercase tracking-widest mb-2">
            Key Events
          </p>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto">
            {eventAnnotations.map((evt) => {
              const isHovered = hoveredEventIndex === evt.index;
              const pillColor =
                evt.type === "earnings" ? { text: "text-tertiary", border: "border-tertiary/30", hoverBg: "bg-tertiary/20", hoverBorder: "border-tertiary" }
                : evt.type === "news" ? { text: "text-[#0ea5e9]", border: "border-[#0ea5e9]/30", hoverBg: "bg-[#0ea5e9]/20", hoverBorder: "border-[#0ea5e9]" }
                : { text: "text-[#8b5cf6]", border: "border-[#8b5cf6]/30", hoverBg: "bg-[#8b5cf6]/20", hoverBorder: "border-[#8b5cf6]" };
              return (
                <button
                  key={`${evt.date}-${evt.label}`}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[10px] font-medium transition-all cursor-pointer whitespace-nowrap border leading-normal",
                    pillColor.text,
                    pillColor.border,
                    isHovered
                      ? cn(pillColor.hoverBg, pillColor.hoverBorder)
                      : "bg-transparent hover:bg-surface-container"
                  )}
                  onMouseEnter={() => setHoveredEventIndex(evt.index)}
                  onMouseLeave={() => setHoveredEventIndex(null)}
                >
                  {evt.label}
                  <span className="text-text-secondary/60 ml-1">
                    {formatDateShort(evt.date)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
