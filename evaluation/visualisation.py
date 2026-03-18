"""
Model Results Visualisation
=============================
Generates publication-quality plots for model evaluation.
Used across all models.
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
from sklearn.metrics import confusion_matrix, roc_curve

logger = logging.getLogger(__name__)
sns.set_theme(style="whitegrid", font_scale=1.1)


def plot_feature_importance(
    importance_df: pd.DataFrame,
    title: str = "Feature Importance",
    top_n: int = 25,
    save_path: Optional[Path] = None,
):
    """Bar chart of top-N most important features."""
    top = importance_df.nlargest(top_n, "importance")

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.barh(range(len(top)), top["importance"].values, color="steelblue", alpha=0.8)
    ax.set_yticks(range(len(top)))
    ax.set_yticklabels(top["feature"].values)
    ax.set_xlabel("Importance Score")
    ax.set_title(title, fontsize=14)
    ax.invert_yaxis()
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


def plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    title: str = "Confusion Matrix",
    save_path: Optional[Path] = None,
):
    """Plot confusion matrix heatmap."""
    cm = confusion_matrix(y_true, y_pred)

    fig, ax = plt.subplots(figsize=(6, 5))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=["Down", "Up"], yticklabels=["Down", "Up"],
        ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(title, fontsize=14)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


def plot_roc_curve(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    title: str = "ROC Curve",
    save_path: Optional[Path] = None,
):
    """Plot ROC curve with AUC."""
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    from sklearn.metrics import roc_auc_score
    auc = roc_auc_score(y_true, y_prob)

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(fpr, tpr, color="steelblue", linewidth=2, label=f"AUC = {auc:.4f}")
    ax.plot([0, 1], [0, 1], "k--", linewidth=0.8, label="Random")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title(title, fontsize=14)
    ax.legend(loc="lower right")
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


def plot_predictions_vs_actual(
    dates: pd.DatetimeIndex,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    title: str = "Predicted vs Actual Returns",
    save_path: Optional[Path] = None,
):
    """Scatter + time series of predicted vs actual returns."""
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))

    # Time series
    ax = axes[0]
    ax.plot(dates, y_true, label="Actual", color="black", alpha=0.7, linewidth=0.8)
    ax.plot(dates, y_pred, label="Predicted", color="steelblue", alpha=0.7, linewidth=0.8)
    ax.set_title(f"{title} — Time Series", fontsize=13)
    ax.set_ylabel("Log Return")
    ax.legend()
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))

    # Scatter
    ax = axes[1]
    ax.scatter(y_true, y_pred, alpha=0.3, s=10, color="steelblue")
    lim = max(abs(y_true.min()), abs(y_true.max()), abs(y_pred.min()), abs(y_pred.max()))
    ax.plot([-lim, lim], [-lim, lim], "r--", linewidth=1, label="Perfect prediction")
    ax.set_xlabel("Actual Log Return")
    ax.set_ylabel("Predicted Log Return")
    ax.set_title(f"{title} — Scatter Plot", fontsize=13)
    ax.legend()

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


def plot_equity_curve(
    dates: pd.DatetimeIndex,
    strategy_returns: pd.Series,
    benchmark_returns: Optional[pd.Series] = None,
    title: str = "Equity Curve",
    save_path: Optional[Path] = None,
):
    """Plot cumulative returns for strategy vs benchmark."""
    fig, axes = plt.subplots(2, 1, figsize=(14, 10), gridspec_kw={"height_ratios": [3, 1]})

    # Cumulative returns
    ax = axes[0]
    cum_strat = (1 + strategy_returns).cumprod()
    ax.plot(dates, cum_strat, label="Strategy", color="steelblue", linewidth=1.5)

    if benchmark_returns is not None:
        cum_bench = (1 + benchmark_returns).cumprod()
        ax.plot(dates, cum_bench, label="Benchmark (Buy & Hold)",
                color="gray", linewidth=1, linestyle="--")

    ax.set_title(title, fontsize=14)
    ax.set_ylabel("Cumulative Return")
    ax.legend(loc="upper left")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))

    # Drawdown
    ax = axes[1]
    rolling_max = cum_strat.cummax()
    drawdown = (cum_strat - rolling_max) / rolling_max
    ax.fill_between(dates, drawdown, 0, color="red", alpha=0.3)
    ax.set_title("Drawdown", fontsize=12)
    ax.set_ylabel("Drawdown")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


def plot_model_comparison_bar(
    comparison_df: pd.DataFrame,
    metric: str,
    title: Optional[str] = None,
    save_path: Optional[Path] = None,
):
    """Grouped bar chart comparing models across tickers for a specific metric."""
    if metric not in comparison_df.columns:
        logger.warning(f"Metric {metric} not found in comparison table")
        return

    pivot = comparison_df.pivot(index="Ticker", columns="Model", values=metric)
    pivot = pivot[pivot.index != "MEAN"]  # Exclude mean row if present

    fig, ax = plt.subplots(figsize=(12, 6))
    pivot.plot(kind="bar", ax=ax, alpha=0.8)
    ax.set_title(title or f"Model Comparison — {metric}", fontsize=14)
    ax.set_ylabel(metric)
    ax.set_xlabel("")
    ax.legend(title="Model")
    plt.xticks(rotation=0)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()
