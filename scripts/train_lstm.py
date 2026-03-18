#!/usr/bin/env python3
"""
LSTM Training Script
=====================
Train LSTM models for all tickers and generate evaluation plots.
"""

import argparse
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Train LSTM models")
    parser.add_argument("--ticker", type=str, default=None, help="Single ticker to train")
    parser.add_argument("--epochs", type=int, default=100, help="Max training epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--patience", type=int, default=10, help="Early stopping patience")
    parser.add_argument("--no-plots", action="store_true", help="Skip plot generation")
    args = parser.parse_args()

    from models.lstm_model import LSTMTrainer, aggregate_lstm_results, plot_training_history
    from evaluation.visualisation import (
        plot_confusion_matrix, plot_roc_curve, plot_predictions_vs_actual,
    )
    from configs.config import PRIMARY_TICKERS

    trainer = LSTMTrainer(
        epochs=args.epochs,
        batch_size=args.batch_size,
        patience=args.patience,
    )

    tickers = [args.ticker] if args.ticker else PRIMARY_TICKERS

    # Train
    results = trainer.train_all(tickers)

    # Summary table
    summary = aggregate_lstm_results(results)
    print("\n" + "=" * 90)
    print("LSTM RESULTS SUMMARY (Test Set)")
    print("=" * 90)
    print(summary.to_string(index=False, float_format="%.4f"))

    # Save summary
    summary.to_csv(trainer.results_dir / "summary.csv", index=False)

    # Generate plots
    if not args.no_plots:
        logger.info("\nGenerating evaluation plots...")
        for ticker, res in results.items():
            pred_df = res["predictions"]

            # Training history
            plot_training_history(
                res["clf_history"],
                f"{ticker} — LSTM Classification",
                save_path=trainer.results_dir / f"{ticker}_clf_history.png",
            )
            plot_training_history(
                res["reg_history"],
                f"{ticker} — LSTM Regression",
                save_path=trainer.results_dir / f"{ticker}_reg_history.png",
            )

            # Confusion matrix
            plot_confusion_matrix(
                pred_df["Target_Direction"].values,
                pred_df["pred_direction"].values,
                f"{ticker} — LSTM Confusion Matrix (Test)",
                save_path=trainer.results_dir / f"{ticker}_confusion_matrix.png",
            )

            # ROC curve
            plot_roc_curve(
                pred_df["Target_Direction"].values,
                pred_df["pred_prob_up"].values,
                f"{ticker} — LSTM ROC Curve (Test)",
                save_path=trainer.results_dir / f"{ticker}_roc_curve.png",
            )

            # Predictions vs actual
            plot_predictions_vs_actual(
                pred_df.index,
                pred_df["Target_LogReturn"].values,
                pred_df["pred_log_return"].values,
                f"{ticker} — LSTM",
                save_path=trainer.results_dir / f"{ticker}_pred_vs_actual.png",
            )

            logger.info(f"  Plots saved for {ticker}")

    logger.info("\nLSTM training complete!")


if __name__ == "__main__":
    main()
