#!/usr/bin/env python3
"""
Backtest Runner
================
Run backtests on model predictions and generate tear sheets.
"""

import argparse
import json
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Run backtests")
    parser.add_argument("--model", type=str, default=None,
                        help="Model name (xgboost, lstm, tft, patchtst)")
    parser.add_argument("--ticker", type=str, default=None)
    parser.add_argument("--threshold", type=float, default=0.55,
                        help="Confidence threshold for entry")
    parser.add_argument("--no-tearsheet", action="store_true")
    args = parser.parse_args()

    from configs.config import PRIMARY_TICKERS, RESULTS_DIR, RAW_DIR
    from backtest.engine import Backtester
    from backtest.tearsheet import generate_tearsheet
    from data.ingestion import load_price_data

    models = [args.model] if args.model else ["xgboost", "lstm", "tft", "patchtst"]
    tickers = [args.ticker] if args.ticker else PRIMARY_TICKERS

    backtester = Backtester(confidence_threshold=args.threshold)

    all_backtest_metrics = []

    for model_name in models:
        model_results_dir = RESULTS_DIR / model_name
        if not model_results_dir.exists():
            logger.warning(f"No results directory for {model_name}, skipping")
            continue

        backtest_output_dir = RESULTS_DIR / "backtest" / model_name
        backtest_output_dir.mkdir(parents=True, exist_ok=True)

        for ticker in tickers:
            pred_path = model_results_dir / f"{ticker}_predictions.parquet"
            if not pred_path.exists():
                logger.warning(f"No predictions for {model_name}/{ticker}, skipping")
                continue

            logger.info(f"\n{'='*60}")
            logger.info(f"BACKTEST: {model_name.upper()} — {ticker}")
            logger.info(f"{'='*60}")

            # Load predictions and prices
            predictions = pd.read_parquet(pred_path)
            try:
                prices = load_price_data(ticker)
            except FileNotFoundError:
                logger.warning(f"No price data for {ticker}, skipping")
                continue

            # Load benchmark
            try:
                benchmark = load_price_data("SPY", RAW_DIR)
            except FileNotFoundError:
                # Fall back: use raw benchmark file
                bench_path = RAW_DIR / "benchmark_SPY.parquet"
                if bench_path.exists():
                    benchmark = pd.read_parquet(bench_path)
                else:
                    benchmark = None

            # Run backtest
            results = backtester.run(predictions, prices, benchmark)

            if not results:
                continue

            # Generate tear sheet
            if not args.no_tearsheet:
                generate_tearsheet(
                    results,
                    model_name=model_name.upper(),
                    ticker=ticker,
                    save_dir=backtest_output_dir,
                )

            # Save metrics
            metrics = results["metrics"]
            metrics["model"] = model_name.upper()
            metrics["ticker"] = ticker
            all_backtest_metrics.append(metrics)

            with open(backtest_output_dir / f"{ticker}_metrics.json", "w") as f:
                json.dump(metrics, f, indent=2, default=str)

            # Save trade log
            results["trade_log"].to_csv(
                backtest_output_dir / f"{ticker}_trades.csv", index=False
            )

    # ── Summary Table ────────────────────────────────────────────
    if all_backtest_metrics:
        summary_df = pd.DataFrame(all_backtest_metrics)
        cols_to_show = [
            "model", "ticker",
            "total_return", "annualised_return", "sharpe_ratio",
            "sortino_ratio", "max_drawdown", "calmar_ratio",
            "win_rate", "profit_factor", "market_exposure",
        ]
        cols_available = [c for c in cols_to_show if c in summary_df.columns]
        summary_display = summary_df[cols_available]

        print("\n" + "=" * 110)
        print("BACKTEST RESULTS SUMMARY")
        print("=" * 110)
        print(summary_display.to_string(index=False, float_format="%.4f"))

        # Save
        output_path = RESULTS_DIR / "backtest" / "backtest_summary.csv"
        summary_df.to_csv(output_path, index=False)
        logger.info(f"\nSaved summary: {output_path}")


if __name__ == "__main__":
    main()
