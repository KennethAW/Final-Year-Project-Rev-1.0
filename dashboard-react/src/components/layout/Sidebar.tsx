import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import { cn } from "@/lib/utils";

const BASE_NAV_ITEMS = [
  { label: "Dashboard", icon: "dashboard", to: "/" },
  { label: "Signal Explorer", icon: "candlestick_chart", to: "/signals" },
  { label: "Backtest Results", icon: "history", to: "/backtest" },
  { label: "Feature Analysis", icon: "science", to: "/features" },
  { label: "Model Comparison", icon: "monitoring", to: "/analytics" },
] as const;

const ADVANCED_NAV_ITEMS = [
  { label: "Methodology", icon: "verified_user", to: "/methodology" },
] as const;

const WMO_EMOJI: Record<number, string> = {
  0: "\u2600\uFE0F",
  1: "\uD83C\uDF24\uFE0F",
  2: "\u26C5",
  3: "\u2601\uFE0F",
  45: "\uD83C\uDF2B\uFE0F",
  48: "\uD83C\uDF2B\uFE0F",
  51: "\uD83C\uDF26\uFE0F",
  53: "\uD83C\uDF26\uFE0F",
  55: "\uD83C\uDF27\uFE0F",
  61: "\uD83C\uDF27\uFE0F",
  63: "\uD83C\uDF27\uFE0F",
  65: "\uD83C\uDF27\uFE0F",
  71: "\uD83C\uDF28\uFE0F",
  73: "\uD83C\uDF28\uFE0F",
  75: "\uD83C\uDF28\uFE0F",
  80: "\uD83C\uDF26\uFE0F",
  81: "\uD83C\uDF27\uFE0F",
  82: "\u26C8\uFE0F",
  95: "\u26A1",
  96: "\u26A1",
  99: "\u26A1",
};

function formatDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DateWeather() {
  const [date, setDate] = useState(formatDate);
  const [weather, setWeather] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const msUntilMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() -
      now.getTime();
    const timeout = setTimeout(() => setDate(formatDate()), msUntilMidnight);
    return () => clearTimeout(timeout);
  }, [date]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        )
          .then((r) => r.json())
          .then((data) => {
            const code: number = data?.current_weather?.weathercode ?? -1;
            const temp: number = data?.current_weather?.temperature;
            const emoji = WMO_EMOJI[code] ?? "\uD83C\uDF24\uFE0F";
            setWeather(`${emoji} ${Math.round(temp)}\u00B0C`);
          })
          .catch(() => setWeather(null));
      },
      () => {
        fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=1.35&longitude=103.82&current_weather=true"
        )
          .then((r) => r.json())
          .then((data) => {
            const code: number = data?.current_weather?.weathercode ?? -1;
            const temp: number = data?.current_weather?.temperature;
            const emoji = WMO_EMOJI[code] ?? "\uD83C\uDF24\uFE0F";
            setWeather(`${emoji} ${Math.round(temp)}\u00B0C`);
          })
          .catch(() => setWeather(null));
      }
    );
  }, []);

  return (
    <p className="text-[10px] text-text-secondary leading-snug mt-0.5">
      {date}{weather ? ` ${weather}` : ""}
    </p>
  );
}

/* ── Ticker Bar ──────────────────────────────────────────────────────────── */

const TICKER_DATA: { symbol: string; price: number; pct: number }[] = [
  { symbol: "AAPL",  price: 266.43, pct:  0.57 },
  { symbol: "MSFT",  price: 411.22, pct: -0.51 },
  { symbol: "GOOGL", price: 337.12, pct:  0.57 },
  { symbol: "JPM",   price: 305.93, pct:  0.12 },
  { symbol: "XOM",   price: 149.01, pct: -0.38 },
  { symbol: "SPY",   price: 699.94, pct:  0.37 },
];

const TICKER_SYMBOLS = TICKER_DATA.map((t) => t.symbol);
const FALLBACK_QUOTES: Record<string, { price: number; pct: number }> =
  Object.fromEntries(
    TICKER_DATA.map((t) => [t.symbol, { price: t.price, pct: t.pct }])
  );

const REFRESH_MS = 60_000;

interface Quote {
  price: number;
  pct: number;
}

/** US equity market hours: 9:30-16:00 ET, Mon-Fri. Holidays ignored. */
function getMarketStatus(): { open: boolean; lastCloseLabel: string } {
  const nowET = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
  const day = nowET.getDay();
  const minutes = nowET.getHours() * 60 + nowET.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const isSession = minutes >= 570 && minutes < 960;
  const open = isWeekday && isSession;

  const lastClose = new Date(nowET);
  if (!(isWeekday && minutes >= 960)) {
    do {
      lastClose.setDate(lastClose.getDate() - 1);
    } while (lastClose.getDay() === 0 || lastClose.getDay() === 6);
  }
  const mm = String(lastClose.getMonth() + 1).padStart(2, "0");
  const dd = String(lastClose.getDate()).padStart(2, "0");
  const yyyy = lastClose.getFullYear();
  return { open, lastCloseLabel: `${mm}/${dd}/${yyyy}` };
}

async function fetchQuote(
  symbol: string,
  token: string
): Promise<Quote | null> {
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${token}`
    );
    if (!r.ok) return null;
    const d = await r.json();
    if (typeof d?.c !== "number" || d.c === 0) return null;
    return { price: d.c, pct: typeof d.dp === "number" ? d.dp : 0 };
  } catch {
    return null;
  }
}

function TickerStrip() {
  const token = import.meta.env.VITE_FINNHUB_API_KEY as string | undefined;
  const [quotes, setQuotes] = useState<Record<string, Quote>>(FALLBACK_QUOTES);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const refresh = async () => {
      const results = await Promise.all(
        TICKER_SYMBOLS.map(async (s) => [s, await fetchQuote(s, token)] as const)
      );
      if (cancelled) return;
      setQuotes((prev) => {
        const next = { ...prev };
        for (const [sym, q] of results) if (q) next[sym] = q;
        return next;
      });
    };

    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  const rows = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS];
  const { open: marketOpen, lastCloseLabel } = getMarketStatus();

  return (
    <div className="mx-3 my-2 rounded-lg border border-outline bg-surface-container/60 overflow-hidden">
      {/* Status header */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-outline/50">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse-dot",
            marketOpen ? "bg-positive" : "bg-negative"
          )}
        />
        <span className="text-[9px] font-bold tracking-widest uppercase text-text-secondary">
          Live Markets
        </span>
        {!marketOpen && (
          <span className="text-[9px] text-text-secondary/60">
            (As of close {lastCloseLabel})
          </span>
        )}
      </div>

      {/* Scrolling tape — clipped inside the rounded box */}
      <div className="overflow-hidden h-7 flex items-center">
        <div className="flex shrink-0 animate-marquee-horiz" style={{ width: "max-content" }}>
          {rows.map((sym, i) => {
            const q = quotes[sym] ?? FALLBACK_QUOTES[sym];
            const positive = q.pct >= 0;
            return (
              <div
                key={`${sym}-${i}`}
                className="flex items-center gap-1.5 px-3 text-[10px] tabular-nums whitespace-nowrap"
              >
                <span className="font-bold text-text-primary tracking-wide">
                  {sym}
                </span>
                <span className="text-text-secondary">{q.price.toFixed(2)}</span>
                <span
                  className={cn(
                    "font-semibold",
                    positive ? "text-positive" : "text-negative"
                  )}
                >
                  {positive ? "\u25B2" : "\u25BC"}
                  {Math.abs(q.pct).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const advancedMode = useAdvancedMode();
  const location = useLocation();
  const navItems = advancedMode
    ? [...BASE_NAV_ITEMS, ...ADVANCED_NAV_ITEMS]
    : BASE_NAV_ITEMS;

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  return (
    <>
      {/* Backdrop -- mobile only */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-outline bg-surface-container transition-transform duration-200 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex flex-col gap-0.5 px-6 py-5 border-b border-outline">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">
              analytics
            </span>
            <span className="text-lg font-bold text-text-primary tracking-tight">
              Alpha Analytics
            </span>
          </div>
          <span className="text-[8px] font-medium text-text-secondary tracking-widest uppercase pl-8">
            Made by: Kenneth A.W.
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to + (advancedMode ? "?advanced=true" : "")}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-white shadow-sm ring-1 ring-primary/10 text-primary"
                        : "text-text-secondary hover:bg-white/60 hover:text-text-primary"
                    )
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Ticker bar */}
        <TickerStrip />

        {/* Bottom branding */}
        <div className="px-4 pb-4 pt-3">
          <p className="text-[10px] text-text-secondary leading-snug">
            ML &amp; Quantitative Trading
          </p>
          <DateWeather />
        </div>
      </aside>
    </>
  );
}
