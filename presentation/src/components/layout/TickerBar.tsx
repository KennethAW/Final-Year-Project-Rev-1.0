import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

// 30 tickers across sectors for visual variety on the presentation tape.
// Includes the 5 primary project tickers (AAPL, MSFT, GOOGL, JPM, XOM).
// Each entry ships with a plausible fallback price so the tape never flashes
// empty if Finnhub is slow or unreachable at demo time.
const TICKER_DATA: { symbol: string; price: number; pct: number }[] = [
  // Project primaries (5)
  { symbol: "AAPL",  price: 220.15, pct:  0.57 },
  { symbol: "MSFT",  price: 418.32, pct: -0.51 },
  { symbol: "GOOGL", price: 167.88, pct:  0.57 },
  { symbol: "JPM",   price: 245.50, pct:  0.12 },
  { symbol: "XOM",   price: 118.75, pct: -0.38 },
  // Tech (7)
  { symbol: "AMZN",  price: 195.45, pct:  0.62 },
  { symbol: "NVDA",  price: 918.50, pct:  2.15 },
  { symbol: "META",  price: 505.20, pct:  0.85 },
  { symbol: "TSLA",  price: 245.30, pct: -1.75 },
  { symbol: "AVGO",  price: 185.60, pct:  0.40 },
  { symbol: "NFLX",  price: 612.30, pct:  0.55 },
  { symbol: "CRM",   price: 295.40, pct: -0.30 },
  // Finance (4)
  { symbol: "V",     price: 285.15, pct:  0.40 },
  { symbol: "MA",    price: 475.20, pct:  0.30 },
  { symbol: "GS",    price: 520.80, pct:  1.25 },
  { symbol: "BAC",   price:  42.30, pct: -0.25 },
  // Healthcare (3)
  { symbol: "UNH",   price: 540.30, pct: -0.85 },
  { symbol: "LLY",   price: 885.40, pct:  1.50 },
  { symbol: "JNJ",   price: 158.25, pct:  0.20 },
  // Consumer (4)
  { symbol: "WMT",   price:  88.20, pct:  0.65 },
  { symbol: "HD",    price: 385.40, pct: -0.20 },
  { symbol: "MCD",   price: 295.30, pct:  0.15 },
  { symbol: "COST",  price: 865.30, pct:  0.90 },
  // Energy (1)
  { symbol: "CVX",   price: 158.20, pct: -0.55 },
  // Industrials (2)
  { symbol: "BA",    price: 178.40, pct: -1.20 },
  { symbol: "CAT",   price: 385.20, pct:  0.70 },
  // Communications (2)
  { symbol: "DIS",   price: 105.60, pct:  0.35 },
  { symbol: "T",     price:  19.80, pct:  0.10 },
  // Index ETFs (2)
  { symbol: "SPY",   price: 567.40, pct:  0.37 },
  { symbol: "QQQ",   price: 485.60, pct:  0.45 },
]

const TICKER_SYMBOLS = TICKER_DATA.map((t) => t.symbol)
const FALLBACK_QUOTES: Record<string, { price: number; pct: number }> =
  Object.fromEntries(
    TICKER_DATA.map((t) => [t.symbol, { price: t.price, pct: t.pct }])
  )

// 60s refresh keeps us at ~30 calls/min — well under Finnhub's 60/min free-tier limit.
const REFRESH_MS = 60_000

interface Quote {
  price: number
  pct: number
}

/** US equity market hours: 9:30–16:00 ET, Mon–Fri. Holidays ignored. */
function getMarketStatus(): { open: boolean; lastCloseLabel: string } {
  const nowET = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  )
  const day = nowET.getDay()
  const minutes = nowET.getHours() * 60 + nowET.getMinutes()
  const isWeekday = day >= 1 && day <= 5
  const isSession = minutes >= 570 && minutes < 960
  const open = isWeekday && isSession

  const lastClose = new Date(nowET)
  if (!(isWeekday && minutes >= 960)) {
    do {
      lastClose.setDate(lastClose.getDate() - 1)
    } while (lastClose.getDay() === 0 || lastClose.getDay() === 6)
  }
  const mm = String(lastClose.getMonth() + 1).padStart(2, "0")
  const dd = String(lastClose.getDate()).padStart(2, "0")
  const yyyy = lastClose.getFullYear()
  return { open, lastCloseLabel: `${mm}/${dd}/${yyyy}` }
}

async function fetchQuote(
  symbol: string,
  token: string
): Promise<Quote | null> {
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`
    )
    if (!r.ok) return null
    const d = await r.json()
    if (typeof d?.c !== "number" || d.c === 0) return null
    return { price: d.c, pct: typeof d.dp === "number" ? d.dp : 0 }
  } catch {
    return null
  }
}

export function TickerBar() {
  const token = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined
  const [quotes, setQuotes] = useState<Record<string, Quote>>(FALLBACK_QUOTES)

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const refresh = async () => {
      const results = await Promise.all(
        TICKER_SYMBOLS.map(async (s) => [s, await fetchQuote(s, token)] as const)
      )
      if (cancelled) return
      setQuotes((prev) => {
        const next = { ...prev }
        for (const [sym, q] of results) if (q) next[sym] = q
        return next
      })
    }

    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [token])

  const rows = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS]
  const { open: marketOpen, lastCloseLabel } = getMarketStatus()

  return (
    <div className="fixed bottom-0 left-20 right-0 z-30 h-7 border-t border-white/10 bg-surface-container-lowest/90 backdrop-blur-md overflow-hidden flex items-center">
      <div className="flex items-center gap-1.5 px-4 shrink-0 border-r border-white/10 h-full">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse-dot",
            marketOpen ? "bg-primary" : "bg-error"
          )}
        />
        <span className="font-[family-name:var(--font-family-label)] text-[9px] font-bold tracking-widest uppercase text-white/70">
          Live Markets
        </span>
        {!marketOpen && (
          <span className="font-[family-name:var(--font-family-label)] text-[9px] text-white/40">
            (As of close {lastCloseLabel})
          </span>
        )}
      </div>
      <div className="relative flex-1 overflow-hidden h-full flex items-center">
        <div className="flex w-max animate-marquee-horiz">
          {rows.map((sym, i) => {
            const q = quotes[sym] ?? FALLBACK_QUOTES[sym]
            const positive = q.pct >= 0
            return (
              <div
                key={`${sym}-${i}`}
                className="flex items-center gap-2 px-5 text-[10px] tabular-nums whitespace-nowrap"
              >
                <span className="font-bold text-white tracking-wide">
                  {sym}
                </span>
                <span className="text-white/80">{q.price.toFixed(2)}</span>
                <span
                  className={cn(
                    "font-semibold",
                    positive ? "text-primary" : "text-error"
                  )}
                >
                  {positive ? "▲" : "▼"}
                  {Math.abs(q.pct).toFixed(2)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
