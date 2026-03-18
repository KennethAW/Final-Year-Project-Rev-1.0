#!/usr/bin/env python3
"""
XGBoost Training Script
========================
Usage:
    python scripts/train_xgboost.py                  # All tickers, 100 trials
    python scripts/train_xgboost.py --trials 50      # Fewer trials for speed
    python scripts/train_xgboost.py --ticker AAPL    # Single ticker
"""

import argparse
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


def main():
    parser = argparse.ArgumentParser(description="Train XGBoost models")
    parser.add_argument("--ticker", type=str, default=None)
    parser.add_argument("--trials", type=int, default=100, help="Optuna HPO trials")
    parser.add_argument("--no-plots", action="store_true")
    args = parser.parse_args()

    from models.xgboost_model import XGBoostTrainer, aggregate_xgboost_results
    from evaluation.visualisation import (
        plot_feature_importance, plot_confusion_matrix,
        plot_roc_curve, plot_predictions_vs_actual,
    )
    from configs.config import PRIMARY_TICKERS

    trainer = XGBoostTrainer(n_trials=args.trials)
    tickers = [args.ticker] if args.ticker else PRIMARY_TICKERS

    results = trainer.train_all(tickers)

    summary = aggregate_xgboost_results(results)
    print("\n" + "=" * 90)
    print("XGBOOST RESULTS SUMMARY (Test Set)")
    print("=" * 90)
    print(summary.to_string(index=False, float_format="%.4f"))
    summary.to_csv(trainer.results_dir / "summary.csv", index=False)

    if not args.no_plots:
        for ticker, res in results.items():
            pred_df = res["predictions"]

            plot_feature_importance(
                res["feature_importance"],
                f"{ticker} — XGBoost Feature Importance",
                save_path=trainer.results_dir / f"{ticker}_feature_importance.png",
            )
            plot_confusion_matrix(
                pred_df["Target_Direction"].values,
                pred_df["pred_direction"].values,
                f"{ticker} — XGBoost Confusion Matrix (Test)",
                save_path=trainer.results_dir / f"{ticker}_confusion_matrix.png",
            )
            plot_roc_curve(
                pred_df["Target_Direction"].values,
                pred_df["pred_prob_up"].values,
                f"{ticker} — XGBoost ROC Curve (Test)",
                save_path=trainer.results_dir / f"{ticker}_roc_curve.png",
            )
            plot_predictions_vs_actual(
                pred_df.index,
                pred_df["Target_LogReturn"].values,
                pred_df["pred_log_return"].values,
                f"{ticker} — XGBoost",
                save_path=trainer.results_dir / f"{ticker}_pred_vs_actual.png",
            )


if __name__ == "__main__":
    main()
