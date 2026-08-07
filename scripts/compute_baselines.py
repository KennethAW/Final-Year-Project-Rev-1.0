"""
Compute simple baseline strategies on the test period to contextualise ML model performance.

Baselines:
    1. Random — 50/50 coin flip (measured, seeded)
    2. SMA_Cross — long when Close > 50-day SMA (classic technical)
    3. Always_Long — always in the market (buy-and-hold proxy)

Metrics: mean directional accuracy, Sharpe ratio.

Output:
    dashboard-react/public/data/baselines.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

WORKTREE_ROOT = Path(__file__).resolve().parent.parent
MAIN_REPO = WORKTREE_ROOT.parent.parent.parent

for candidate in (WORKTREE_ROOT / "evaluation" / "results", MAIN_REPO / "evaluation" / "results"):
    if candidate.exists():
        RESULTS_DIR = candidate
        REPO_ROOT = candidate.parent.parent
        break
else:
    raise SystemExit("Could not find evaluation/results/")

RAW_DIR = REPO_ROOT / "data" / "raw"
OUTPUT_PATH = WORKTREE_ROOT / "dashboard-react" / "public" / "data" / "baselines.json"

TICKERS = ["AAPL", "MSFT", "GOOGL", "JPM", "XOM"]
SEED = 42
TRADING_DAYS = 252
RF_ANNUAL = 0.04


def sharpe(returns: np.ndarray) -> float:
    """Annualised Sharpe ratio."""
    if returns.std() == 0 or len(returns) == 0:
        return 0.0
    rf_daily = (1 + RF_ANNUAL) ** (1 / TRADING_DAYS) - 1
    excess = returns - rf_daily
    return float(excess.mean() / returns.std(ddof=1) * np.sqrt(TRADING_DAYS))


def load_test_slice(ticker: str) -> pd.DataFrame | None:
    """Use XGBoost's prediction file as the canonical test-period window for this ticker."""
    path = RESULTS_DIR / "xgboost" / f"{ticker}_predictions.parquet"
    if not path.exists():
        return None
    df = pd.read_parquet(path)
    # Keep only what we need
    keep = [c for c in ["Close", "Target_Direction", "Target_LogReturn", "SMA_20"] if c in df.columns]
    return df[keep]


def random_strategy(df: pd.DataFrame, rng: np.random.Generator) -> dict:
    """Random 50/50 coin-flip direction."""
    pred = rng.integers(0, 2, size=len(df))
    correct = (pred == df["Target_Direction"].to_numpy()).astype(int)
    acc = float(correct.mean())
    daily_return = df["Close"].pct_change().shift(-1).fillna(0).to_numpy()
    strat_r = np.where(pred == 1, daily_return, 0)[:-1]
    s = sharpe(strat_r)
    return {"accuracy": round(acc, 4), "sharpe": round(s, 4)}


def sma_cross_strategy(df: pd.DataFrame) -> dict:
    """Long when Close > 50-day SMA."""
    sma = df["Close"].rolling(50, min_periods=1).mean()
    pred = (df["Close"] > sma).astype(int).to_numpy()
    correct = (pred == df["Target_Direction"].to_numpy()).astype(int)
    acc = float(correct.mean())
    daily_return = df["Close"].pct_change().shift(-1).fillna(0).to_numpy()
    strat_r = np.where(pred == 1, daily_return, 0)[:-1]
    s = sharpe(strat_r)
    return {"accuracy": round(acc, 4), "sharpe": round(s, 4)}


def always_long_strategy(df: pd.DataFrame) -> dict:
    """Always long."""
    daily_return = df["Close"].pct_change().shift(-1).fillna(0).to_numpy()
    pred = np.ones(len(df), dtype=int)
    # Directional accuracy = fraction of up-days
    acc = float((df["Target_Direction"] == 1).mean())
    s = sharpe(daily_return[:-1])
    return {"accuracy": round(acc, 4), "sharpe": round(s, 4)}


def main():
    print(f"Source: {RESULTS_DIR}")
    print(f"Output: {OUTPUT_PATH}\n")

    rng = np.random.default_rng(SEED)

    rows = []
    for ticker in TICKERS:
        df = load_test_slice(ticker)
        if df is None:
            continue
        rows.append({
            "ticker": ticker,
            "baseline": "random",
            **random_strategy(df, rng),
        })
        rows.append({
            "ticker": ticker,
            "baseline": "sma_cross",
            **sma_cross_strategy(df),
        })
        rows.append({
            "ticker": ticker,
            "baseline": "always_long",
            **always_long_strategy(df),
        })

    # Per-baseline means
    summary = []
    for baseline in ("random", "sma_cross", "always_long"):
        at = [r for r in rows if r["baseline"] == baseline]
        if not at:
            continue
        summary.append({
            "baseline": baseline,
            "label": {
                "random": "Random",
                "sma_cross": "SMA Crossover (50d)",
                "always_long": "Always Long",
            }[baseline],
            "mean_accuracy": round(float(np.mean([r["accuracy"] for r in at])), 4),
            "mean_sharpe": round(float(np.mean([r["sharpe"] for r in at])), 4),
        })

    payload = {
        "rows": rows,
        "summary": summary,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {OUTPUT_PATH}\n")

    print("=== Baseline Summary (mean across tickers) ===")
    for s in summary:
        print(f"  {s['label']:<22}  accuracy={s['mean_accuracy']*100:.1f}%   Sharpe={s['mean_sharpe']:+.3f}")


if __name__ == "__main__":
    main()
