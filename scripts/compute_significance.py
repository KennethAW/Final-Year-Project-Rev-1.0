"""
Compute statistical significance for each model-ticker pair.

Outputs:
    dashboard-react/public/data/significance.json

Metrics per model-ticker:
    - binomial_pvalue: p-value for directional_accuracy vs 0.5 (null = random)
    - acc_ci_low, acc_ci_high: Bootstrap 95% CI for directional accuracy
    - accuracy: mean directional accuracy on test set
    - n_samples: number of test observations

Pairwise per ticker:
    - DM test (Diebold-Mariano) p-values comparing each model pair on RMSE

Usage:
    python scripts/compute_significance.py
"""

from __future__ import annotations

import json
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

WORKTREE_ROOT = Path(__file__).resolve().parent.parent
# Main repo (where evaluation/results actually lives)
MAIN_REPO = WORKTREE_ROOT.parent.parent.parent

# Prefer worktree results if they exist, else fall back to main repo
for candidate in (WORKTREE_ROOT / "evaluation" / "results", MAIN_REPO / "evaluation" / "results"):
    if candidate.exists():
        RESULTS_DIR = candidate
        break
else:
    raise SystemExit("Could not find evaluation/results/ in worktree or main repo")

OUTPUT_PATH = WORKTREE_ROOT / "dashboard-react" / "public" / "data" / "significance.json"

MODELS = ["xgboost", "lstm", "tft", "patchtst"]
TICKERS = ["AAPL", "MSFT", "GOOGL", "JPM", "XOM"]
N_BOOTSTRAP = 1000
SEED = 42


def bootstrap_ci(correct: np.ndarray, n_boot: int = N_BOOTSTRAP, alpha: float = 0.05):
    """Bootstrap 95% CI for mean of a 0/1 array."""
    rng = np.random.default_rng(SEED)
    n = len(correct)
    means = np.empty(n_boot)
    for i in range(n_boot):
        idx = rng.integers(0, n, n)
        means[i] = correct[idx].mean()
    lo = float(np.quantile(means, alpha / 2))
    hi = float(np.quantile(means, 1 - alpha / 2))
    return lo, hi


def diebold_mariano(e1: np.ndarray, e2: np.ndarray) -> float:
    """
    Simple DM test on squared prediction errors.
    Returns two-sided p-value. Smaller p = models are different.
    """
    d = e1 ** 2 - e2 ** 2
    n = len(d)
    mean_d = float(d.mean())
    # Newey-West-like variance with lag 0 (diagonal)
    var_d = float(d.var(ddof=1))
    if var_d <= 0 or n == 0:
        return 1.0
    dm_stat = mean_d / np.sqrt(var_d / n)
    # Two-sided p-value from standard normal
    p = 2 * (1 - stats.norm.cdf(abs(dm_stat)))
    return float(p)


def load_predictions(model: str, ticker: str) -> pd.DataFrame | None:
    path = RESULTS_DIR / model / f"{ticker}_predictions.parquet"
    if not path.exists():
        return None
    return pd.read_parquet(path)


def per_ticker_per_model_stats(model: str, ticker: str) -> dict | None:
    df = load_predictions(model, ticker)
    if df is None or "pred_direction" not in df.columns or "Target_Direction" not in df.columns:
        return None

    correct = (df["pred_direction"] == df["Target_Direction"]).astype(int).to_numpy()
    n = int(len(correct))
    if n == 0:
        return None

    accuracy = float(correct.mean())
    # Binomial test vs 0.5 (random)
    n_correct = int(correct.sum())
    try:
        # scipy >= 1.7
        bt = stats.binomtest(n_correct, n, p=0.5, alternative="two-sided")
        p_binom = float(bt.pvalue)
    except AttributeError:
        p_binom = float(stats.binom_test(n_correct, n, p=0.5, alternative="two-sided"))

    ci_lo, ci_hi = bootstrap_ci(correct)
    return {
        "model": model,
        "ticker": ticker,
        "n_samples": n,
        "accuracy": round(accuracy, 4),
        "binomial_pvalue": round(p_binom, 4),
        "acc_ci_low": round(ci_lo, 4),
        "acc_ci_high": round(ci_hi, 4),
        "significant_vs_random": bool(p_binom < 0.05),
    }


def pairwise_dm_for_ticker(ticker: str) -> list[dict]:
    """DM test for each pair of models on RMSE of log-return prediction."""
    # Load all models' predictions for this ticker, aligned by index
    frames = {}
    for m in MODELS:
        df = load_predictions(m, ticker)
        if df is None or "pred_log_return" not in df.columns or "Target_LogReturn" not in df.columns:
            continue
        frames[m] = df[["pred_log_return", "Target_LogReturn"]].dropna()

    results = []
    for a, b in combinations(frames.keys(), 2):
        # Align by intersection of indices
        common = frames[a].index.intersection(frames[b].index)
        if len(common) < 30:
            continue
        e1 = (frames[a].loc[common, "pred_log_return"] - frames[a].loc[common, "Target_LogReturn"]).to_numpy()
        e2 = (frames[b].loc[common, "pred_log_return"] - frames[b].loc[common, "Target_LogReturn"]).to_numpy()
        p = diebold_mariano(e1, e2)
        results.append({
            "ticker": ticker,
            "model_a": a,
            "model_b": b,
            "dm_pvalue": round(p, 4),
            "significant": bool(p < 0.05),
            "n_common": int(len(common)),
        })
    return results


def aggregate_per_model(per_ticker_rows: list[dict]) -> list[dict]:
    """Aggregate across tickers: mean accuracy, mean CI width, count of significant tickers."""
    by_model: dict[str, list[dict]] = {}
    for row in per_ticker_rows:
        by_model.setdefault(row["model"], []).append(row)

    out = []
    for model, rows in by_model.items():
        accs = [r["accuracy"] for r in rows]
        ci_widths = [r["acc_ci_high"] - r["acc_ci_low"] for r in rows]
        n_sig = sum(1 for r in rows if r["significant_vs_random"])
        out.append({
            "model": model,
            "n_tickers": len(rows),
            "mean_accuracy": round(float(np.mean(accs)), 4),
            "mean_ci_width": round(float(np.mean(ci_widths)), 4),
            "n_significant_vs_random": n_sig,
        })
    return out


def main():
    print(f"Source: {RESULTS_DIR}")
    print(f"Output: {OUTPUT_PATH}")

    per_ticker_rows = []
    for m in MODELS:
        for t in TICKERS:
            row = per_ticker_per_model_stats(m, t)
            if row:
                per_ticker_rows.append(row)

    print(f"\n[Per-ticker] Computed stats for {len(per_ticker_rows)} model-ticker pairs")

    dm_rows = []
    for t in TICKERS:
        dm_rows.extend(pairwise_dm_for_ticker(t))
    print(f"[DM test] Computed {len(dm_rows)} pairwise comparisons")

    aggregated = aggregate_per_model(per_ticker_rows)
    print(f"[Aggregated] {len(aggregated)} model summaries")

    payload = {
        "per_ticker": per_ticker_rows,
        "pairwise_dm": dm_rows,
        "per_model_summary": aggregated,
        "notes": {
            "binomial_test": "H0: directional_accuracy = 0.5 (random). p<0.05 means significantly different from random.",
            "bootstrap_ci": f"95% bootstrap CI ({N_BOOTSTRAP} resamples) for directional accuracy.",
            "dm_test": "Diebold-Mariano test on squared log-return prediction errors. p<0.05 means the two models have significantly different forecasting accuracy.",
        },
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"\nWrote {OUTPUT_PATH}")

    # Print a quick human-readable summary
    print("\n=== Summary ===")
    for row in aggregated:
        print(f"  {row['model'].upper():<10}  mean_acc={row['mean_accuracy']*100:.1f}%  CI_width={row['mean_ci_width']*100:.1f}pp  {row['n_significant_vs_random']}/{row['n_tickers']} tickers sig. vs random")


if __name__ == "__main__":
    main()
