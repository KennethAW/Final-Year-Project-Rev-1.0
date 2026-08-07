import { useState, useCallback } from "react";
import { modelDisplayName } from "@/lib/formatters";

export interface TradeLike {
  entryDate: string;
  exitDate: string;
  durationDays: number;
  return: number;
  profitable: boolean;
}

/**
 * Format an ISO date into a long, readable form:
 * "Friday, 6 December 2024"
 */
export function fullDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Count weekday-only days between two ISO dates (exclusive of entry, inclusive of exit).
 * Ignores US market holidays so expect ~1–2% error. Good enough for demo tooltips.
 */
export function tradingDays(entryIso: string, exitIso: string): number {
  const start = new Date(entryIso);
  const end = new Date(exitIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
  let count = 0;
  const d = new Date(start);
  while (d < end) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}

/**
 * Shared hover-tooltip state used by both the Dashboard ledger and Backtest page full log.
 *
 * Smart positioning: the tooltip appears to the RIGHT of the row by default, but flips to the
 * LEFT (or is clamped inside the viewport) when the row is too close to the right edge.
 * Vertical position is clamped so the tooltip never exceeds the viewport top/bottom.
 */
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT = 260; // rough estimate; clamp adjusts for overflow
const EDGE_PAD = 12;

export function useTradeHover() {
  const [hovered, setHovered] = useState<{
    index: number;
    top: number;
    left: number;
  } | null>(null);

  const onRowEnter = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>, index: number) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Decide horizontal side — right of row, else left, else clamp inside viewport
      let left: number;
      const rightFits = rect.right + 8 + TOOLTIP_WIDTH + EDGE_PAD <= vw;
      const leftFits = rect.left - 8 - TOOLTIP_WIDTH >= EDGE_PAD;
      if (rightFits) {
        left = rect.right + 8;
      } else if (leftFits) {
        left = rect.left - 8 - TOOLTIP_WIDTH;
      } else {
        // Neither side has room — clamp so tooltip stays fully on-screen
        left = Math.max(EDGE_PAD, vw - TOOLTIP_WIDTH - EDGE_PAD);
      }

      // Vertical: prefer row top; shift up if it would overflow bottom
      let top = rect.top;
      if (top + TOOLTIP_HEIGHT + EDGE_PAD > vh) {
        top = Math.max(EDGE_PAD, vh - TOOLTIP_HEIGHT - EDGE_PAD);
      }
      if (top < EDGE_PAD) top = EDGE_PAD;

      setHovered({ index, top, left });
    },
    []
  );

  const onRowLeave = useCallback(() => setHovered(null), []);

  return { hovered, onRowEnter, onRowLeave };
}

interface TradeHoverTooltipProps {
  trade: TradeLike;
  tradeNumber: number;
  totalTrades: number;
  model: string;
  ticker: string;
  rank: number;
  totalRanked: number;
  entryPrice: number | null;
  exitPrice: number | null;
  top: number;
  left: number;
}

/**
 * Floating tooltip rendered beside a hovered trade row.
 * Uses position: fixed + inline styles so it escapes any parent overflow-hidden / scroll containers.
 */
export function TradeHoverTooltip({
  trade,
  tradeNumber,
  totalTrades,
  model,
  ticker,
  rank,
  totalRanked,
  entryPrice,
  exitPrice,
  top,
  left,
}: TradeHoverTooltipProps) {
  const tDays = tradingDays(trade.entryDate, trade.exitDate);

  return (
    <div
      style={{
        position: "fixed",
        top,
        left,
        zIndex: 60,
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
        minWidth: 280,
        fontSize: 11.5,
        pointerEvents: "none",
        color: "#0f172a",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          Trade #{tradeNumber} of {totalTrades}
        </span>
        <span
          style={{
            borderRadius: 9999,
            padding: "2px 8px",
            fontSize: 10,
            fontWeight: 700,
            background: trade.profitable ? "#d1fae5" : "#fee2e2",
            color: trade.profitable ? "#10b981" : "#ef4444",
          }}
        >
          {trade.profitable ? "WIN" : "LOSS"}
        </span>
      </div>

      <p style={{ color: "#64748b", marginBottom: 6, fontSize: 10.5 }}>
        {modelDisplayName(model)} &middot; {ticker}
      </p>

      <table style={{ width: "100%", borderSpacing: 0 }}>
        <tbody>
          <tr>
            <td style={{ color: "#64748b", padding: "2px 0" }}>Entry</td>
            <td style={{ textAlign: "right", fontWeight: 600 }}>
              {fullDate(trade.entryDate)}
              {entryPrice !== null && (
                <span style={{ color: "#27609d", marginLeft: 6 }}>
                  @ ${entryPrice.toFixed(2)}
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", padding: "2px 0" }}>Exit</td>
            <td style={{ textAlign: "right", fontWeight: 600 }}>
              {fullDate(trade.exitDate)}
              {exitPrice !== null && (
                <span style={{ color: "#27609d", marginLeft: 6 }}>
                  @ ${exitPrice.toFixed(2)}
                </span>
              )}
            </td>
          </tr>
          <tr>
            <td style={{ color: "#64748b", padding: "2px 0" }}>Holding period</td>
            <td style={{ textAlign: "right", fontWeight: 600 }}>
              {tDays} trading day{tDays !== 1 ? "s" : ""}
              <span style={{ color: "#94a3b8", marginLeft: 4, fontWeight: 400 }}>
                ({trade.durationDays} cal.)
              </span>
            </td>
          </tr>
          <tr>
            <td
              style={{
                color: "#64748b",
                padding: "6px 0 2px 0",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              Return
            </td>
            <td
              style={{
                textAlign: "right",
                fontWeight: 700,
                padding: "6px 0 2px 0",
                borderTop: "1px solid #f1f5f9",
                color: trade.return >= 0 ? "#10b981" : "#ef4444",
              }}
            >
              {trade.return >= 0 ? "+" : ""}
              {(trade.return * 100).toFixed(4)}%
            </td>
          </tr>
          {entryPrice !== null && exitPrice !== null && (
            <tr>
              <td style={{ color: "#64748b", padding: "2px 0" }}>Price change</td>
              <td
                style={{
                  textAlign: "right",
                  fontWeight: 600,
                  color: exitPrice >= entryPrice ? "#10b981" : "#ef4444",
                }}
              >
                {exitPrice >= entryPrice ? "+" : ""}$
                {(exitPrice - entryPrice).toFixed(2)}
              </td>
            </tr>
          )}
          <tr>
            <td style={{ color: "#64748b", padding: "2px 0" }}>Rank by return</td>
            <td style={{ textAlign: "right", fontWeight: 600 }}>
              #{rank} of {totalRanked}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
