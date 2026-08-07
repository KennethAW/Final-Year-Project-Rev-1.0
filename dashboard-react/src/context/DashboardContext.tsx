import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface DashboardState {
  ticker: string;
  setTicker: (t: string) => void;
  model: string;
  setModel: (m: string) => void;
}

const DashboardContext = createContext<DashboardState | null>(null);

const TICKERS = ["AAPL", "MSFT", "GOOGL", "JPM", "XOM"] as const;
const MODELS = ["xgboost", "lstm", "tft", "patchtst"] as const;

export { TICKERS, MODELS };

const STORAGE_KEY_TICKER = "dashboard-ticker";
const STORAGE_KEY_MODEL = "dashboard-model";

function readStored(key: string, fallback: string, allowed: readonly string[]): string {
  try {
    const v = localStorage.getItem(key);
    if (v && (allowed as readonly string[]).includes(v)) return v;
  } catch { /* ignore */ }
  return fallback;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [ticker, setTickerRaw] = useState<string>(() =>
    readStored(STORAGE_KEY_TICKER, TICKERS[0], TICKERS)
  );
  const [model, setModelRaw] = useState<string>(() =>
    readStored(STORAGE_KEY_MODEL, MODELS[0], MODELS)
  );

  const setTicker = useCallback((t: string) => {
    setTickerRaw(t);
    try { localStorage.setItem(STORAGE_KEY_TICKER, t); } catch { /* ignore */ }
  }, []);

  const setModel = useCallback((m: string) => {
    setModelRaw(m);
    try { localStorage.setItem(STORAGE_KEY_MODEL, m); } catch { /* ignore */ }
  }, []);

  // Listen for changes from other tabs/iframes on the same origin
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY_TICKER && e.newValue) {
        if ((TICKERS as readonly string[]).includes(e.newValue)) {
          setTickerRaw(e.newValue);
        }
      }
      if (e.key === STORAGE_KEY_MODEL && e.newValue) {
        if ((MODELS as readonly string[]).includes(e.newValue)) {
          setModelRaw(e.newValue);
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <DashboardContext value={{ ticker, setTicker, model, setModel }}>
      {children}
    </DashboardContext>
  );
}

export function useDashboard(): DashboardState {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
