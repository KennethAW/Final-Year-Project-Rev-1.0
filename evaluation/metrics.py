"""
Evaluation Metrics
===================
Standardised ML and financial metric computation used across all models.
"""

import logging
from typing import Dict, Optional

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, matthews_corrcoef,
    mean_squared_error, mean_absolute_error,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════
# ML METRICS
# ═══════════════════════════════════════════════════════════════════

def compute_classification_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: Optional[np.ndarray] = None,
) -> dict:
    """
    Compute all classification metrics specified in the project.

    Parameters:
        y_true: Ground truth binary labels (0/1)
        y_pred: Predicted binary labels
        y_prob: Predicted probability of positive class (for ROC-AUC)
    """
    metrics = {
        "accuracy": accuracy_score(y_true, y_pred),
        "f1_macro": f1_score(y_true, y_pred, average="macro"),
        "precision_macro": precision_score(y_true, y_pred, average="macro", zero_division=0),
        "recall_macro": recall_score(y_true, y_pred, average="macro", zero_division=0),
        "mcc": matthews_corrcoef(y_true, y_pred),
    }

    if y_prob is not None:
        try:
            metrics["roc_auc"] = roc_auc_score(y_true, y_prob)
        except ValueError:
            metrics["roc_auc"] = float("nan")

    return metrics


def compute_regression_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
) -> dict:
    """
    Compute all regression metrics specified in the project.
    """
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)

    # Directional accuracy
    da = np.mean(np.sign(y_pred) == np.sign(y_true))

    mask = np.abs(y_true) > 1e-8
    mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) if mask.sum() > 0 else float("nan")

    return {
        "rmse": rmse,
        "mae": mae,
        "mape": mape,
        "directional_accuracy": da,
    }


# ═══════════════════════════════════════════════════════════════════
# FINANCIAL METRICS
# ═══════════════════════════════════════════════════════════════════

def compute_financial_metrics(
    returns: pd.Series,
    benchmark_returns: Optional[pd.Series] = None,
    risk_free_rate: float = 0.04,  # ~4% annual (current T-bill approx)
    trading_days: int = 252,
) -> dict:
    """
    Compute financial performance metrics from a return series.

    Parameters:
        returns: Daily strategy returns (not cumulative)
        benchmark_returns: Daily benchmark returns for comparison
        risk_free_rate: Annualised risk-free rate
        trading_days: Trading days per year
    """
    if len(returns) == 0:
        return {}

    daily_rf = (1 + risk_free_rate) ** (1 / trading_days) - 1
    excess = returns - daily_rf

    total_return = (1 + returns).prod() - 1
    n_years = len(returns) / trading_days
    ann_return = (1 + total_return) ** (1 / max(n_years, 1e-6)) - 1

    # Annualised volatility
    ann_vol = returns.std() * np.sqrt(trading_days)

    # Sharpe Ratio
    sharpe = (excess.mean() / excess.std() * np.sqrt(trading_days)) if excess.std() > 0 else 0.0

    downside = excess[excess < 0]
    downside_std = np.sqrt((downside ** 2).mean()) * np.sqrt(trading_days) if len(downside) > 0 else 1e-10
    sortino = (ann_return - risk_free_rate) / downside_std

    # Maximum Drawdown
    cum_returns = (1 + returns).cumprod()
    rolling_max = cum_returns.cummax()
    drawdown = (cum_returns - rolling_max) / rolling_max
    max_drawdown = drawdown.min()

    # Calmar Ratio
    calmar = ann_return / abs(max_drawdown) if abs(max_drawdown) > 1e-10 else 0.0

    # Win rate
    trades = returns[returns != 0]
    win_rate = (trades > 0).mean() if len(trades) > 0 else 0.0

    # Profit factor
    gross_profit = trades[trades > 0].sum()
    gross_loss = abs(trades[trades < 0].sum())
    profit_factor = gross_profit / gross_loss if gross_loss > 1e-10 else float("inf")

    metrics = {
        "total_return": total_return,
        "annualised_return": ann_return,
        "annualised_volatility": ann_vol,
        "sharpe_ratio": sharpe,
        "sortino_ratio": sortino,
        "max_drawdown": max_drawdown,
        "calmar_ratio": calmar,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
    }

    # Benchmark comparison
    if benchmark_returns is not None and len(benchmark_returns) > 0:
        bench_total = (1 + benchmark_returns).prod() - 1
        bench_ann = (1 + bench_total) ** (1 / max(n_years, 1e-6)) - 1
        bench_vol = benchmark_returns.std() * np.sqrt(trading_days)
        bench_excess = benchmark_returns - daily_rf
        bench_sharpe = (bench_excess.mean() / bench_excess.std() * np.sqrt(trading_days)) if bench_excess.std() > 0 else 0.0

        metrics["benchmark_return"] = bench_total
        metrics["benchmark_ann_return"] = bench_ann
        metrics["benchmark_sharpe"] = bench_sharpe
        metrics["excess_return"] = ann_return - bench_ann
        metrics["information_ratio"] = (
            (returns - benchmark_returns).mean() /
            (returns - benchmark_returns).std() * np.sqrt(trading_days)
        ) if (returns - benchmark_returns).std() > 0 else 0.0

    return metrics


# ═══════════════════════════════════════════════════════════════════
# CONSOLIDATED RESULTS TABLE
# ═══════════════════════════════════════════════════════════════════

def create_model_comparison_table(
    all_results: Dict[str, Dict[str, dict]],
) -> pd.DataFrame:
    """
    Create a consolidated comparison table across all models and tickers.

    Parameters:
        all_results: Nested dict {model_name: {ticker: results_dict}}
                     where results_dict has keys like 'clf_test_metrics', 'reg_test_metrics'

    Returns:
        DataFrame suitable for thesis Table inclusion.
    """
    rows = []
    for model_name, ticker_results in all_results.items():
        for ticker, res in ticker_results.items():
            row = {"Model": model_name, "Ticker": ticker}

            if "clf_test_metrics" in res:
                for k, v in res["clf_test_metrics"].items():
                    row[f"Clf_{k}"] = v

            if "reg_test_metrics" in res:
                for k, v in res["reg_test_metrics"].items():
                    row[f"Reg_{k}"] = v

            if "financial_metrics" in res:
                for k, v in res["financial_metrics"].items():
                    row[f"Fin_{k}"] = v

            rows.append(row)

    return pd.DataFrame(rows)


def print_metrics_report(metrics: dict, title: str = "Metrics"):
    """Pretty-print a metrics dictionary."""
    logger.info(f"\n{'─'*50}")
    logger.info(f"  {title}")
    logger.info(f"{'─'*50}")
    for k, v in metrics.items():
        if isinstance(v, float):
            logger.info(f"  {k:30s}: {v:.6f}")
        else:
            logger.info(f"  {k:30s}: {v}")
    logger.info(f"{'─'*50}")
