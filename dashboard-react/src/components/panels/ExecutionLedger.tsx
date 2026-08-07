import { useMemo } from "react";
import { useTrades } from "@/hooks/useTrades";
import { usePredictions } from "@/hooks/usePredictions";
import { useDashboard } from "@/context/DashboardContext";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  TradeHoverTooltip,
  useTradeHover,
} from "@/components/panels/TradeHoverTooltip";

export function ExecutionLedger() {
  const { data: trades, loading } = useTrades();
  const { data: predictions } = usePredictions();
  const { model, ticker } = useDashboard();
  const { hovered, onRowEnter, onRowLeave } = useTradeHover();

  const priceByDate = useMemo(() => {
    const map = new Map<string, number>();
    if (!predictions) return map;
    for (const p of predictions) map.set(p.date, p.close);
    return map;
  }, [predictions]);

  if (loading) {
    return <Skeleton className="h-[600px] w-full" />;
  }

  const totalCount = trades?.length ?? 0;
  const latestTrades = trades?.slice(-15).reverse() ?? [];

  // Pre-compute rank by return (descending across ALL trades)
  const rankMap = new Map<string, number>();
  if (trades) {
    const sorted = [...trades]
      .map((t, i) => ({ key: `${t.entryDate}-${i}`, ret: t.return }))
      .sort((a, b) => b.ret - a.ret);
    sorted.forEach((t, i) => rankMap.set(t.key, i + 1));
  }

  return (
    <Card className="flex flex-col gap-3 overflow-hidden relative">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">
          Execution Ledger
        </h2>
        <span className="rounded-full bg-surface-container px-2.5 py-0.5 text-[11px] font-medium text-text-secondary">
          {totalCount} trades
        </span>
      </div>

      <div className="overflow-x-auto -mx-3 px-3 md:-mx-5 md:px-5">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-outline text-left">
              <th className="py-2 pr-3 font-medium text-text-secondary">Entry</th>
              <th className="py-2 pr-3 font-medium text-text-secondary">Exit</th>
              <th className="py-2 pr-3 font-medium text-text-secondary text-center">Days</th>
              <th className="py-2 pr-3 font-medium text-text-secondary text-right">Return</th>
              <th className="py-2 font-medium text-text-secondary text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {latestTrades.map((trade, i) => {
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

      {hovered && (() => {
        const trade = latestTrades[hovered.index];
        if (!trade) return null;
        // latestTrades is the last 15 trades reversed — map back to original index
        const tradeNumber = totalCount - hovered.index;
        const rank = rankMap.get(`${trade.entryDate}-${tradeNumber - 1}`) ?? 0;
        return (
          <TradeHoverTooltip
            trade={trade}
            tradeNumber={tradeNumber}
            totalTrades={totalCount}
            model={model}
            ticker={ticker}
            rank={rank}
            totalRanked={totalCount}
            entryPrice={priceByDate.get(trade.entryDate) ?? null}
            exitPrice={priceByDate.get(trade.exitDate) ?? null}
            top={hovered.top}
            left={hovered.left}
          />
        );
      })()}
    </Card>
  );
}
