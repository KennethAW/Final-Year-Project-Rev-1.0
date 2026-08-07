"""
Export evaluation results to static JSON for the React dashboard.

Usage:
    python scripts/export_dashboard_data.py

Reads from evaluation/results/ and data/raw/ in the project root,
outputs JSON files to dashboard-react/public/data/.
"""

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def _main_checkout(start: Path) -> Path:
    """Resolve the main repository root.

    Generated data (evaluation/results/, data/raw/) is gitignored, so it only
    exists in the primary checkout. When this script runs from a linked git
    worktree, fall back to the shared git directory to locate it.
    """
    try:
        common_dir = subprocess.run(
            ["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
            cwd=start, capture_output=True, text=True, check=True,
        ).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        return start
    return Path(common_dir).parent if common_dir else start


MAIN_REPO = _main_checkout(PROJECT_ROOT)

RESULTS_DIR = MAIN_REPO / "evaluation" / "results"
RAW_DIR = MAIN_REPO / "data" / "raw"
OUTPUT_DIR = PROJECT_ROOT / "dashboard-react" / "public" / "data"

TICKERS = ["AAPL", "MSFT", "GOOGL", "JPM", "XOM"]
MODELS = ["xgboost", "lstm", "tft", "patchtst"]


def safe_json(obj):
    """Convert numpy/pandas types to JSON-serialisable Python types."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj) if np.isfinite(obj) else None
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, pd.Timestamp):
        return obj.isoformat()[:10]
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, default=safe_json, indent=None, separators=(",", ":"))
    print(f"  -> {path.relative_to(OUTPUT_DIR)}")


def export_prices():
    """Export OHLCV price data for the test period (~2023-07 to 2024-12)."""
    print("\n[Prices]")
    # Determine the test period from any prediction file
    sample_pred = RESULTS_DIR / "xgboost" / "AAPL_predictions.parquet"
    if sample_pred.exists():
        df = pd.read_parquet(sample_pred)
        start_date = df.index.min()
        end_date = df.index.max()
    else:
        start_date = pd.Timestamp("2023-07-01")
        end_date = pd.Timestamp("2024-12-31")

    for ticker in TICKERS:
        price_path = RAW_DIR / f"price_{ticker}.parquet"
        if not price_path.exists():
            print(f"  [SKIP] {ticker} - no price data")
            continue
        df = pd.read_parquet(price_path)
        df = df.loc[start_date:end_date].copy()
        records = []
        for date, row in df.iterrows():
            records.append({
                "date": date.isoformat()[:10],
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        write_json(OUTPUT_DIR / "prices" / f"{ticker}.json", records)


def _load_prices(ticker: str) -> pd.DataFrame:
    """Load and cache OHLCV price data for a ticker."""
    price_path = RAW_DIR / f"price_{ticker}.parquet"
    if price_path.exists():
        return pd.read_parquet(price_path)
    return pd.DataFrame()


def export_model_data():
    """Export per-model, per-ticker training metrics, predictions, and feature importance."""
    print("\n[Model Data]")
    available = {}
    for model in MODELS:
        model_tickers = []
        for ticker in TICKERS:
            metrics_path = RESULTS_DIR / model / f"{ticker}_metrics.json"
            if not metrics_path.exists():
                continue
            model_tickers.append(ticker)

            # Training metrics (copy as-is)
            with open(metrics_path) as f:
                metrics = json.load(f)
            write_json(OUTPUT_DIR / model / f"{ticker}_metrics.json", metrics)

            # Predictions (extract key columns only)
            pred_path = RESULTS_DIR / model / f"{ticker}_predictions.parquet"
            if pred_path.exists():
                df = pd.read_parquet(pred_path)

                # XGBoost has full feature columns including Close + Date index
                # Other models only have target + prediction columns, no Date index
                has_close = "Close" in df.columns
                has_date_index = df.index.name == "Date"

                if not has_close or not has_date_index:
                    # Join with price data to get Close + Date
                    prices = _load_prices(ticker)
                    if not prices.empty:
                        if has_date_index:
                            df = df.join(prices[["Close"]], how="left")
                        else:
                            # No date index — align by position using the test period
                            # Find the test period dates from XGBoost predictions
                            xgb_pred = RESULTS_DIR / "xgboost" / f"{ticker}_predictions.parquet"
                            if xgb_pred.exists():
                                xgb_df = pd.read_parquet(xgb_pred)
                                test_dates = xgb_df.index[-len(df):]
                            else:
                                test_dates = prices.index[-len(df):]
                            df.index = test_dates[:len(df)]
                            df.index.name = "Date"
                            df = df.join(prices[["Close"]], how="left")

                if "Close" not in df.columns:
                    continue

                records = []
                for date, row in df.iterrows():
                    close = float(row["Close"])
                    pred_lr = float(row["pred_log_return"])
                    pred_price = close * np.exp(pred_lr)
                    records.append({
                        "date": date.isoformat()[:10] if hasattr(date, "isoformat") else str(date),
                        "close": round(close, 2),
                        "predDirection": int(row["pred_direction"]),
                        "predProbUp": round(float(row["pred_prob_up"]), 4),
                        "predLogReturn": round(pred_lr, 6),
                        "predPrice": round(pred_price, 2),
                        "targetDirection": int(row["Target_Direction"]),
                        "targetLogReturn": round(float(row["Target_LogReturn"]), 6),
                    })
                write_json(OUTPUT_DIR / model / f"{ticker}_predictions.json", records)

            # Feature importance (XGBoost native, or TFT encoder importance)
            # Different models produce importance on wildly different scales:
            #   XGBoost: gain-based weights ~0.02 range
            #   TFT:     variable-selection weights ~70 range (raw softmax-like)
            # We normalise all to sum-to-1 so the dashboard can render consistent percentages.
            fi_path = RESULTS_DIR / model / f"{ticker}_feature_importance.csv"
            if not fi_path.exists():
                fi_path = RESULTS_DIR / model / f"{ticker}_encoder_importance.csv"
            if fi_path.exists():
                fi_df = pd.read_csv(fi_path)
                col_name = "importance" if "importance" in fi_df.columns else fi_df.columns[1]
                feat_col = "feature" if "feature" in fi_df.columns else fi_df.columns[0]
                top = fi_df.nlargest(25, col_name).copy()
                # Normalise to sum-to-1 across the top 25 for dashboard-friendly percentages
                total = float(top[col_name].sum())
                if total > 0:
                    top["importance_norm"] = top[col_name] / total
                else:
                    top["importance_norm"] = 0.0
                fi_records = [
                    {"feature": row[feat_col], "importance": round(float(row["importance_norm"]), 6)}
                    for _, row in top.iterrows()
                ]
                write_json(OUTPUT_DIR / model / f"{ticker}_feature_importance.json", fi_records)

        available[model] = model_tickers
    return available


def export_training_history():
    """Export training loss curves (LSTM, PatchTST only — tree/lightning don't save this format)."""
    print("\n[Training History]")
    for model in MODELS:
        for ticker in TICKERS:
            for task in ("clf", "reg"):
                path = RESULTS_DIR / model / f"{ticker}_{task}_history.csv"
                if not path.exists():
                    continue
                df = pd.read_csv(path)
                # Columns: train_loss, val_loss, lr
                records = []
                for i, row in df.iterrows():
                    records.append({
                        "epoch": int(i) + 1,
                        "train_loss": round(float(row["train_loss"]), 6),
                        "val_loss": round(float(row["val_loss"]), 6),
                        "lr": round(float(row.get("lr", 0)), 6) if "lr" in row else None,
                    })
                # Detect early-stopping: epoch where val_loss was at its minimum
                val_losses = df["val_loss"].to_numpy()
                best_epoch = int(val_losses.argmin()) + 1
                payload = {
                    "task": task,
                    "records": records,
                    "best_epoch": best_epoch,
                    "n_epochs": len(records),
                    "final_train_loss": round(float(df["train_loss"].iloc[-1]), 6),
                    "final_val_loss": round(float(df["val_loss"].iloc[-1]), 6),
                    "min_val_loss": round(float(val_losses.min()), 6),
                    "train_val_gap_pct": round(
                        float(
                            (df["train_loss"].iloc[-1] - df["val_loss"].iloc[-1])
                            / max(abs(df["val_loss"].iloc[-1]), 1e-9)
                            * 100
                        ),
                        2,
                    ),
                }
                write_json(OUTPUT_DIR / model / f"{ticker}_{task}_history.json", payload)


def export_backtest_data():
    """Export backtest metrics and trade logs."""
    print("\n[Backtest]")
    for model in MODELS:
        for ticker in TICKERS:
            # Backtest metrics
            bt_path = RESULTS_DIR / "backtest" / model / f"{ticker}_metrics.json"
            if bt_path.exists():
                with open(bt_path) as f:
                    bt = json.load(f)
                write_json(OUTPUT_DIR / model / f"{ticker}_backtest_metrics.json", bt)

            # Trade log
            trades_path = RESULTS_DIR / "backtest" / model / f"{ticker}_trades.csv"
            if trades_path.exists():
                df = pd.read_csv(trades_path)
                records = [
                    {
                        "entryDate": row["entry_date"],
                        "exitDate": row["exit_date"],
                        "durationDays": int(row["duration_days"]),
                        "return": round(float(row["return"]), 6),
                        "profitable": bool(row["profitable"]),
                    }
                    for _, row in df.iterrows()
                ]
                write_json(OUTPUT_DIR / model / f"{ticker}_trades.json", records)

    # Backtest summary
    summary_path = RESULTS_DIR / "backtest" / "backtest_summary.csv"
    if summary_path.exists():
        df = pd.read_csv(summary_path)
        write_json(OUTPUT_DIR / "backtest" / "backtest_summary.json",
                   df.to_dict(orient="records"))


def export_feature_correlations():
    """Export feature-target correlations from XGBoost predictions (which contain all feature columns)."""
    print("\n[Feature Correlations]")
    EXCLUDE = {"Close", "High", "Low", "Open", "Volume", "Ticker",
               "Target_Direction", "Target_LogReturn",
               "pred_direction", "pred_prob_up", "pred_log_return"}
    for ticker in TICKERS:
        pred_path = RESULTS_DIR / "xgboost" / f"{ticker}_predictions.parquet"
        if not pred_path.exists():
            continue
        df = pd.read_parquet(pred_path)
        feat_cols = [c for c in df.columns if c not in EXCLUDE]
        if "Target_LogReturn" not in df.columns or not feat_cols:
            continue
        corr = df[feat_cols].corrwith(df["Target_LogReturn"]).dropna()
        # Sort by absolute correlation descending, take top 25
        top = corr.abs().nlargest(25)
        records = [
            {"feature": f, "correlation": round(float(corr[f]), 6)}
            for f in top.index
        ]
        write_json(OUTPUT_DIR / "correlations" / f"{ticker}_correlation.json", records)


def export_comparison():
    """Export cross-model comparison data."""
    print("\n[Comparison]")
    comp_path = RESULTS_DIR / "comparison" / "model_comparison.csv"
    if comp_path.exists():
        df = pd.read_csv(comp_path)
        write_json(OUTPUT_DIR / "comparison" / "model_comparison.json",
                   df.to_dict(orient="records"))

    # EDA summary
    eda_path = RESULTS_DIR / "eda" / "00_summary_statistics.csv"
    if eda_path.exists():
        df = pd.read_csv(eda_path)
        write_json(OUTPUT_DIR / "comparison" / "eda_summary.json",
                   df.to_dict(orient="records"))


def main():
    print(f"Exporting dashboard data to {OUTPUT_DIR}")
    print(f"Source: {RESULTS_DIR}")

    export_prices()
    available = export_model_data()
    export_training_history()
    export_backtest_data()
    export_feature_correlations()
    export_comparison()

    # Write manifest
    manifest = {
        "tickers": TICKERS,
        "models": MODELS,
        "generatedAt": datetime.now().isoformat(),
        "available": available,
    }
    write_json(OUTPUT_DIR / "manifest.json", manifest)

    print(f"\nDone! {sum(len(v) for v in available.values())} model-ticker combinations exported.")


if __name__ == "__main__":
    main()
