#!/usr/bin/env python3
"""
Model Comparison Script
========================
Loads results from all trained models and produces a consolidated
comparison table and plots.
"""

import json
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from configs.config import PRIMARY_TICKERS, RESULTS_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

sns.set_theme(style="whitegrid", font_scale=1.1)

COMPARE_DIR = RESULTS_DIR / "comparison"
COMPARE_DIR.mkdir(parents=True, exist_ok=True)

MODELS = ["xgboost", "lstm", "tft", "patchtst"]


def load_model_metrics(model_name: str) -> list:
    """Load metrics JSON files for a model."""
    model_dir = RESULTS_DIR / model_name
    if not model_dir.exists():
        logger.warning(f"No results for {model_name}")
        return []

    records = []
    for ticker in PRIMARY_TICKERS:
        path = model_dir / f"{ticker}_metrics.json"
        if path.exists():
            with open(path) as f:
                data = json.load(f)
            record = {"Model": model_name.upper(), "Ticker": ticker}

            # Classification
            clf = data.get("clf_test", data.get("clf_test_metrics", {}))
            for k, v in clf.items():
                record[f"Clf_{k}"] = v

            # Regression
            reg = data.get("reg_test", data.get("reg_test_metrics", {}))
            for k, v in reg.items():
                record[f"Reg_{k}"] = v

            records.append(record)

    return records


def build_comparison_table() -> pd.DataFrame:
    """Build consolidated comparison across all models."""
    all_records = []
    for model in MODELS:
        all_records.extend(load_model_metrics(model))

    if not all_records:
        logger.error("No model results found!")
        return pd.DataFrame()

    df = pd.DataFrame(all_records)

    # Coerce all metric columns to numeric
    for col in df.columns:
        if col not in ["Model", "Ticker"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Add mean rows per model
    means = []
    for model in df["Model"].unique():
        model_df = df[df["Model"] == model]
        mean_row = {"Model": model, "Ticker": "MEAN"}
        for col in df.columns:
            if col not in ["Model", "Ticker"]:
                mean_row[col] = model_df[col].mean()
        means.append(mean_row)

    df = pd.concat([df, pd.DataFrame(means)], ignore_index=True)
    return df


def plot_metric_comparison(df: pd.DataFrame, metric: str, title: str):
    """Grouped bar chart comparing models on a single metric."""
    plot_df = df[df["Ticker"] != "MEAN"].copy()
    if metric not in plot_df.columns:
        return

    fig, ax = plt.subplots(figsize=(12, 6))
    pivot = plot_df.pivot(index="Ticker", columns="Model", values=metric)

    # Sort columns by model name for consistent ordering
    pivot = pivot.reindex(columns=sorted(pivot.columns))
    pivot.plot(kind="bar", ax=ax, alpha=0.8, width=0.7)

    ax.set_title(title, fontsize=14)
    ax.set_ylabel(metric.replace("_", " ").title())
    ax.set_xlabel("")
    ax.legend(title="Model")
    plt.xticks(rotation=0)
    plt.tight_layout()
    plt.savefig(COMPARE_DIR / f"compare_{metric}.png", bbox_inches="tight", dpi=150)
    plt.close()


def plot_mean_comparison(df: pd.DataFrame):
    """Radar/bar chart of mean metrics across models."""
    means = df[df["Ticker"] == "MEAN"].copy()
    if means.empty:
        return

    # Select key metrics
    key_metrics = {
        "Clf_accuracy": "Accuracy",
        "Clf_f1_macro": "F1 (Macro)",
        "Clf_mcc": "MCC",
        "Reg_rmse": "RMSE",
        "Reg_directional_accuracy": "Dir. Accuracy",
    }

    available = {k: v for k, v in key_metrics.items() if k in means.columns}
    if not available:
        return

    fig, axes = plt.subplots(1, len(available), figsize=(4 * len(available), 5))
    if len(available) == 1:
        axes = [axes]

    for ax, (col, label) in zip(axes, available.items()):
        models = means["Model"].values
        values = means[col].values

        colors = ["#2196F3", "#FF9800", "#4CAF50", "#9C27B0"][:len(models)]
        ax.bar(models, values, color=colors, alpha=0.8)
        ax.set_title(label, fontsize=12)
        ax.set_ylabel(label)

        # Add value labels
        for i, v in enumerate(values):
            ax.text(i, v + 0.001, f"{v:.4f}", ha="center", fontsize=9)

    plt.suptitle("Model Comparison — Mean Across Tickers", fontsize=14, y=1.02)
    plt.tight_layout()
    plt.savefig(COMPARE_DIR / "compare_mean_summary.png", bbox_inches="tight", dpi=150)
    plt.close()


def main():
    logger.info("Building model comparison table...")
    df = build_comparison_table()

    if df.empty:
        logger.error("No results to compare. Train models first.")
        return

    # Print table
    print("\n" + "=" * 100)
    print("CONSOLIDATED MODEL COMPARISON (Test Set)")
    print("=" * 100)
    print(df.to_string(index=False, float_format="%.4f"))

    # Save table
    df.to_csv(COMPARE_DIR / "model_comparison.csv", index=False)
    logger.info(f"Saved: {COMPARE_DIR / 'model_comparison.csv'}")

    # Generate comparison plots
    logger.info("Generating comparison plots...")

    for metric in ["Clf_accuracy", "Clf_f1_macro", "Clf_mcc", "Clf_roc_auc",
                    "Reg_rmse", "Reg_mae", "Reg_directional_accuracy"]:
        if metric in df.columns:
            plot_metric_comparison(
                df, metric,
                f"Model Comparison — {metric.replace('_', ' ').title()}"
            )

    plot_mean_comparison(df)

    logger.info(f"All comparison outputs saved to: {COMPARE_DIR}")


if __name__ == "__main__":
    main()
