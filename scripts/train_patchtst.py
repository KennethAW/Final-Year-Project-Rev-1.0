#!/usr/bin/env python3
"""
PatchTST Training Script
==========================
Usage:
    python scripts/train_patchtst.py                          # Full training
    python scripts/train_patchtst.py --ticker AAPL --epochs 20  # Quick test
    python scripts/train_patchtst.py --patch-len 8 --stride 4   # Custom patches
"""

import argparse
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="Train PatchTST models")
    parser.add_argument("--ticker", type=str, default=None)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--patience", type=int, default=10)
    parser.add_argument("--patch-len", type=int, default=4, help="Patch length")
    parser.add_argument("--stride", type=int, default=2, help="Patch stride")
    parser.add_argument("--d-model", type=int, default=128, help="Model dimension")
    parser.add_argument("--n-layers", type=int, default=3, help="Transformer layers")
    parser.add_argument("--n-heads", type=int, default=4, help="Attention heads")
    parser.add_argument("--no-plots", action="store_true")
    args = parser.parse_args()

    from models.patchtst_model import PatchTSTTrainer, aggregate_patchtst_results
    from models.lstm_model import plot_training_history
    from evaluation.visualisation import (
        plot_confusion_matrix, plot_roc_curve, plot_predictions_vs_actual,
    )
    from configs.config import PRIMARY_TICKERS

    trainer = PatchTSTTrainer(
        epochs=args.epochs, batch_size=args.batch_size, patience=args.patience,
        patch_len=args.patch_len, stride=args.stride,
        d_model=args.d_model, n_layers=args.n_layers, n_heads=args.n_heads,
    )

    tickers = [args.ticker] if args.ticker else PRIMARY_TICKERS
    results = trainer.train_all(tickers)

    summary = aggregate_patchtst_results(results)
    print("\n" + "=" * 90)
    print("PatchTST RESULTS SUMMARY (Test Set)")
    print("=" * 90)
    print(summary.to_string(index=False, float_format="%.4f"))
    summary.to_csv(trainer.results_dir / "summary.csv", index=False)

    if not args.no_plots:
        logger.info("\nGenerating plots...")
        for ticker, res in results.items():
            pred_df = res["predictions"]

            plot_training_history(
                res["clf_history"], f"{ticker} — PatchTST Classification",
                save_path=trainer.results_dir / f"{ticker}_clf_history.png",
            )
            plot_training_history(
                res["reg_history"], f"{ticker} — PatchTST Regression",
                save_path=trainer.results_dir / f"{ticker}_reg_history.png",
            )
            plot_confusion_matrix(
                pred_df["Target_Direction"].values, pred_df["pred_direction"].values,
                f"{ticker} — PatchTST Confusion Matrix (Test)",
                save_path=trainer.results_dir / f"{ticker}_confusion_matrix.png",
            )
            plot_roc_curve(
                pred_df["Target_Direction"].values, pred_df["pred_prob_up"].values,
                f"{ticker} — PatchTST ROC Curve (Test)",
                save_path=trainer.results_dir / f"{ticker}_roc_curve.png",
            )
            plot_predictions_vs_actual(
                pred_df.index, pred_df["Target_LogReturn"].values,
                pred_df["pred_log_return"].values,
                f"{ticker} — PatchTST",
                save_path=trainer.results_dir / f"{ticker}_pred_vs_actual.png",
            )
            logger.info(f"  Plots saved for {ticker}")

    logger.info("\nPatchTST training complete!")


if __name__ == "__main__":
    main()
