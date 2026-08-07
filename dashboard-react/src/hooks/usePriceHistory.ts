import { useDashboard } from "@/context/DashboardContext";
import { useFetchJson } from "./useFetchJson";
import type { PriceBar } from "@/lib/types";

/**
 * Full 10-year OHLCV history for the current ticker (train + val + test).
 * Used by the overlay chart to compute SMAs that extend all the way to the
 * start of the test window — the ≥200 trading days of pre-test history give
 * the 200D SMA a valid value from day 1 of the test set.
 */
export function usePriceHistory() {
  const { ticker } = useDashboard();
  return useFetchJson<PriceBar[]>(`/data/prices/${ticker}.json`);
}
