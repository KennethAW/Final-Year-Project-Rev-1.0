#!/usr/bin/env python3
"""
TFT Training Script
====================
Train Temporal Fusion Transformer for all tickers and generate
interpretability plots.
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
    parser = argparse.ArgumentParser(description="Train TFT models")
    parser.add_argument("--ticker", type=str, default=None, help="Single ticker")
    parser.add_argument("--epochs", type=int, default=50, help="Max epochs")
    parser.add_argument("--batch-size", type=int, default=64, help="Batch size")
    parser.add_argument("--patience", type=int, default=8, help="Early stopping patience")
    parser.add_argument("--hidden-size", type=int, default=64, help="TFT hidden size")
    parser.add_argument("--attention-heads", type=int, default=4, help="Attention heads")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--no-plots", action="store_true", help="Skip plot generation")
    args = parser.parse_args()

    from models.tft_model import (
        TFTTrainer, aggregate_tft_results,
        plot_variable_importance, plot_attention_weights,
    )
    from evaluation.visualisation import (
        plot_confusion_matrix, plot_predictions_vs_actual,
    )
    from configs.config import PRIMARY_TICKERS
    import numpy as np

    trainer = TFTTrainer(
        max_epochs=args.epochs,
        batch_size=args.batch_size,
        patience=args.patience,
        hidden_size=args.hidden_size,
        attention_head_size=args.attention_heads,
        learning_rate=args.lr,
    )

    tickers = [args.ticker] if args.ticker else PRIMARY_TICKERS
    results = trainer.train_all(tickers)

    # Summary
    summary = aggregate_tft_results(results)
    print("\n" + "=" * 90)
    print("TFT RESULTS SUMMARY (Test Set)")
    print("=" * 90)
    print(summary.to_string(index=False, float_format="%.4f"))
    summary.to_csv(trainer.results_dir / "summary.csv", index=False)

    # Plots
    if not args.no_plots:
        logger.info("\nGenerating TFT visualisations...")
        for ticker, res in results.items():
            preds = res["predictions"]

            # Confusion matrix
            plot_confusion_matrix(
                preds["actual_direction"], preds["pred_direction"],
                f"{ticker} — TFT Confusion Matrix (Test)",
                save_path=trainer.results_dir / f"{ticker}_confusion_matrix.png",
            )

            # Predictions vs actual
            n = len(preds["actuals"])
            dummy_dates = np.arange(n)
            plot_predictions_vs_actual(
                dummy_dates, preds["actuals"], preds["point_preds"],
                f"{ticker} — TFT",
                save_path=trainer.results_dir / f"{ticker}_pred_vs_actual.png",
            )

            interp = res.get("interpretation", {})
            if "encoder_variable_importance" in interp:
                plot_variable_importance(
                    interp["encoder_variable_importance"],
                    f"{ticker} — TFT Encoder Variable Importance",
                    save_path=trainer.results_dir / f"{ticker}_encoder_importance.png",
                )
                logger.info(f"  {ticker}: Saved encoder variable importance plot")

            if "decoder_variable_importance" in interp:
                plot_variable_importance(
                    interp["decoder_variable_importance"],
                    f"{ticker} — TFT Decoder Variable Importance",
                    save_path=trainer.results_dir / f"{ticker}_decoder_importance.png",
                )

            if "attention_weights" in interp:
                plot_attention_weights(
                    interp["attention_weights"],
                    f"{ticker} — TFT Temporal Attention",
                    save_path=trainer.results_dir / f"{ticker}_attention.png",
                )
                logger.info(f"  {ticker}: Saved attention weight plot")

    logger.info("\nTFT training complete!")


if __name__ == "__main__":
    main()
