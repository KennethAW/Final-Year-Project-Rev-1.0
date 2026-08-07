"""
Compute backtest metrics at multiple transaction-cost levels per model-ticker
using the production Backtester (with stop-loss, take-profit, position sizing,
risk management) — same code path as the original 0/20-beats-SPY result.

Output:
    dashboard-react/public/data/cost_sensitivity.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

WORKTREE_ROOT = Path(__file__).resolve().parent.parent
MAIN_REPO = WORKTREE_ROOT.parent.parent.parent

if (MAIN_REPO / "evaluation" / "results").exists():
    REPO_ROOT = MAIN_REPO
else:
    REPO_ROOT = WORKTREE_ROOT

sys.path.insert(0, str(REPO_ROOT))
from backtest.engine import Backtester  # noqa: E402

RESULTS_DIR = REPO_ROOT / "evaluation" / "results"
RAW_DIR = REPO_ROOT / "data" / "raw"
OUTPUT_PATH = WORKTREE_ROOT / "dashboard-react" / "public" / "data" / "cost_sensitivity.json"

MODELS = ["xgboost", "lstm", "tft", "patchtst"]
TICKERS = ["AAPL", "MSFT", "GOOGL", "JPM", "XOM"]
COST_LEVELS_BPS = [0, 2, 5, 10, 20]


def run_backtest_at_cost(preds: pd.DataFrame, prices: pd.DataFrame, bench: pd.DataFrame, bps: float) -> dict | None:
    bt = Backtester(transaction_cost_bps=bps)
    try:
        result = bt.run(preds, prices, benchmark=bench)
    except Exception as e:
        print(f"    Backtester error at {bps}bps: {e}")
        return None
    if not result or "metrics" not in result:
        return None
    return result["metrics"]


def main():
    print(f"Source: {RESULTS_DIR}")
    print(f"Cost levels: {COST_LEVELS_BPS} bps")

    bench_path = RAW_DIR / "benchmark_SPY.parquet"
    if not bench_path.exists():
        raise SystemExit(f"Benchmark not found at {bench_path}")
    bench = pd.read_parquet(bench_path)

    rows = []
    for model in MODELS:
        for ticker in TICKERS:
            ppath = RESULTS_DIR / model / f"{ticker}_predictions.parquet"
            pxpath = RAW_DIR / f"price_{ticker}.parquet"
            if not ppath.exists() or not pxpath.exists():
                continue
            preds = pd.read_parquet(ppath)
            prices = pd.read_parquet(pxpath)

            for bps in COST_LEVELS_BPS:
                m = run_backtest_at_cost(preds, prices, bench, bps)
                if not m:
                    continue
                beats_spy = m.get("total_return", 0) > m.get("benchmark_return", 0)
                rows.append({
                    "model": model,
                    "ticker": ticker,
                    "bps": bps,
                    "sharpe_ratio": round(float(m.get("sharpe_ratio", 0)), 4),
                    "total_return": round(float(m.get("total_return", 0)), 4),
                    "annualised_return": round(float(m.get("annualised_return", 0)), 4),
                    "benchmark_return": round(float(m.get("benchmark_return", 0)), 4),
                    "beats_spy": bool(beats_spy),
                })
            print(f"  {model.upper():<10} {ticker:<6} done")

    print(f"\nTotal rows: {len(rows)}")

    summary_by_bps = []
    for bps in COST_LEVELS_BPS:
        at_level = [r for r in rows if r["bps"] == bps]
        beats_count = sum(1 for r in at_level if r["beats_spy"])
        summary_by_bps.append({
            "bps": bps,
            "total": len(at_level),
            "beats_spy": beats_count,
            "mean_sharpe": round(
                sum(r["sharpe_ratio"] for r in at_level) / max(len(at_level), 1), 4
            ),
            "mean_total_return": round(
                sum(r["total_return"] for r in at_level) / max(len(at_level), 1), 4
            ),
        })

    payload = {
        "rows": rows,
        "summary_by_bps": summary_by_bps,
        "cost_levels_bps": COST_LEVELS_BPS,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"\nWrote {OUTPUT_PATH}")

    print("\n=== Summary: strategies beating SPY at each cost level ===")
    for s in summary_by_bps:
        print(f"  {s['bps']:>3} bps:  {s['beats_spy']:>2} / {s['total']}  beats SPY   (mean Sharpe {s['mean_sharpe']:+.3f}, mean tot.ret {s['mean_total_return']*100:+.1f}%)")


if __name__ == "__main__":
    main()
