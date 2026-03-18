"""
Tear Sheet Generator
=====================
Produces multi-panel performance reports including cumulative returns,
drawdown, rolling Sharpe, monthly heatmap, and trade analysis.
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns

logger = logging.getLogger(__name__)
sns.set_theme(style="whitegrid", font_scale=1.0)


def generate_tearsheet(
    results: dict,
    model_name: str = "Model",
    ticker: str = "",
    save_dir: Optional[Path] = None,
):
    """
    Generate a full tear sheet from backtest results.

    Parameters:
        results: Output from Backtester.run()
        model_name: Name for plot titles
        ticker: Ticker symbol
        save_dir: Directory to save plots
    """
    if save_dir:
        save_dir.mkdir(parents=True, exist_ok=True)

    daily = results["daily_data"]
    metrics = results["metrics"]
    strat_ret = results["strategy_returns"]
    bench_ret = results["benchmark_returns"]
    trade_log = results["trade_log"]

    title_prefix = f"{model_name} — {ticker}" if ticker else model_name

    # ── 1. Full Tear Sheet (multi-panel figure) ──────────────────
    fig = plt.figure(figsize=(16, 22))
    gs = fig.add_gridspec(5, 2, hspace=0.35, wspace=0.3)

    # Panel 1: Cumulative returns
    ax1 = fig.add_subplot(gs[0, :])
    _plot_cumulative_returns(ax1, daily, title_prefix)

    # Panel 2: Drawdown
    ax2 = fig.add_subplot(gs[1, :])
    _plot_drawdown(ax2, strat_ret)

    # Panel 3: Rolling Sharpe
    ax3 = fig.add_subplot(gs[2, :])
    _plot_rolling_sharpe(ax3, strat_ret)

    # Panel 4: Monthly returns heatmap
    ax4 = fig.add_subplot(gs[3, 0])
    _plot_monthly_heatmap(ax4, strat_ret)

    # Panel 5: Return distribution
    ax5 = fig.add_subplot(gs[3, 1])
    _plot_return_distribution(ax5, strat_ret)

    # Panel 6: Metrics summary table
    ax6 = fig.add_subplot(gs[4, :])
    _plot_metrics_table(ax6, metrics)

    fig.suptitle(f"{title_prefix} — Backtest Tear Sheet", fontsize=16, y=0.995)

    if save_dir:
        path = save_dir / f"{ticker}_{model_name.lower()}_tearsheet.png"
        plt.savefig(path, bbox_inches="tight", dpi=150)
        logger.info(f"Saved tear sheet: {path}")
    plt.close()

    # ── 2. Standalone equity curve ───────────────────────────────
    if save_dir:
        fig, ax = plt.subplots(figsize=(14, 6))
        _plot_cumulative_returns(ax, daily, title_prefix)
        plt.savefig(save_dir / f"{ticker}_{model_name.lower()}_equity_curve.png",
                    bbox_inches="tight", dpi=150)
        plt.close()

    # ── 3. Trade analysis ────────────────────────────────────────
    if save_dir and len(trade_log) > 0:
        _plot_trade_analysis(trade_log, title_prefix, save_dir, ticker, model_name)

    # ── 4. Annual returns bar chart ──────────────────────────────
    if save_dir:
        _plot_annual_returns(strat_ret, bench_ret, title_prefix, save_dir, ticker, model_name)


# ── Individual Plot Functions ────────────────────────────────────

def _plot_cumulative_returns(ax, daily: pd.DataFrame, title: str):
    """Plot cumulative returns: strategy vs benchmark."""
    if "cum_strategy" in daily.columns:
        ax.plot(daily.index, daily["cum_strategy"],
                label="Strategy", color="steelblue", linewidth=1.5)
    if "cum_benchmark" in daily.columns:
        ax.plot(daily.index, daily["cum_benchmark"],
                label="Benchmark (B&H)", color="gray", linewidth=1, linestyle="--")

    ax.set_title(f"{title} — Cumulative Returns", fontsize=13)
    ax.set_ylabel("Growth of $1")
    ax.legend(loc="upper left")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax.axhline(1.0, color="black", linewidth=0.5, linestyle=":")


def _plot_drawdown(ax, returns: pd.Series):
    """Plot underwater (drawdown) chart."""
    cum = (1 + returns).cumprod()
    rolling_max = cum.cummax()
    drawdown = (cum - rolling_max) / rolling_max

    ax.fill_between(returns.index, drawdown, 0, color="red", alpha=0.3)
    ax.plot(returns.index, drawdown, color="red", linewidth=0.5)
    ax.set_title("Drawdown", fontsize=13)
    ax.set_ylabel("Drawdown")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))

    # Annotate max drawdown
    max_dd_date = drawdown.idxmin()
    max_dd_val = drawdown.min()
    ax.annotate(
        f"Max: {max_dd_val:.2%}",
        xy=(max_dd_date, max_dd_val),
        fontsize=9, color="red",
        xytext=(10, -15), textcoords="offset points",
    )


def _plot_rolling_sharpe(ax, returns: pd.Series, window: int = 252):
    """Plot 252-day rolling Sharpe ratio."""
    if len(returns) < window:
        window = max(20, len(returns) // 2)

    rolling_mean = returns.rolling(window).mean()
    rolling_std = returns.rolling(window).std()
    rolling_sharpe = (rolling_mean / rolling_std) * np.sqrt(252)

    ax.plot(returns.index, rolling_sharpe, color="steelblue", linewidth=1)
    ax.axhline(0, color="red", linewidth=0.8, linestyle="--")
    ax.axhline(1, color="green", linewidth=0.5, linestyle=":", alpha=0.5)
    ax.axhline(-1, color="red", linewidth=0.5, linestyle=":", alpha=0.5)
    ax.fill_between(returns.index, rolling_sharpe, 0,
                    where=rolling_sharpe > 0, color="green", alpha=0.1)
    ax.fill_between(returns.index, rolling_sharpe, 0,
                    where=rolling_sharpe < 0, color="red", alpha=0.1)
    ax.set_title(f"Rolling Sharpe Ratio ({window}-day)", fontsize=13)
    ax.set_ylabel("Sharpe Ratio")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))


def _plot_monthly_heatmap(ax, returns: pd.Series):
    """Monthly returns heatmap (year × month)."""
    monthly = returns.resample("ME").apply(lambda x: (1 + x).prod() - 1)
    if len(monthly) == 0:
        return

    monthly_df = pd.DataFrame({
        "year": monthly.index.year,
        "month": monthly.index.month,
        "return": monthly.values,
    })

    pivot = monthly_df.pivot_table(index="year", columns="month", values="return")
    pivot.columns = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][:len(pivot.columns)]

    sns.heatmap(
        pivot * 100, annot=True, fmt=".1f", cmap="RdYlGn",
        center=0, ax=ax, cbar_kws={"label": "Return (%)"},
        linewidths=0.5,
    )
    ax.set_title("Monthly Returns (%)", fontsize=12)
    ax.set_ylabel("")


def _plot_return_distribution(ax, returns: pd.Series):
    """Histogram of daily returns."""
    ax.hist(returns[returns != 0], bins=60, density=True,
            color="steelblue", alpha=0.7, edgecolor="white")
    ax.axvline(returns.mean(), color="red", linestyle="--",
               linewidth=1, label=f"Mean: {returns.mean():.4f}")
    ax.axvline(0, color="black", linewidth=0.5)
    ax.set_title("Daily Return Distribution", fontsize=12)
    ax.set_xlabel("Daily Return")
    ax.legend(fontsize=9)


def _plot_metrics_table(ax, metrics: dict):
    """Render key metrics as a table in the figure."""
    ax.axis("off")

    key_metrics = [
        ("Total Return", f"{metrics.get('total_return', 0):.2%}"),
        ("Ann. Return", f"{metrics.get('annualised_return', 0):.2%}"),
        ("Ann. Volatility", f"{metrics.get('annualised_volatility', 0):.2%}"),
        ("Sharpe Ratio", f"{metrics.get('sharpe_ratio', 0):.3f}"),
        ("Sortino Ratio", f"{metrics.get('sortino_ratio', 0):.3f}"),
        ("Max Drawdown", f"{metrics.get('max_drawdown', 0):.2%}"),
        ("Calmar Ratio", f"{metrics.get('calmar_ratio', 0):.3f}"),
        ("Win Rate", f"{metrics.get('win_rate', 0):.2%}"),
        ("Profit Factor", f"{metrics.get('profit_factor', 0):.3f}"),
        ("Market Exposure", f"{metrics.get('market_exposure', 0):.2%}"),
    ]

    # Add benchmark if available
    if "benchmark_ann_return" in metrics:
        key_metrics.extend([
            ("Benchmark Ann. Return", f"{metrics['benchmark_ann_return']:.2%}"),
            ("Excess Return", f"{metrics.get('excess_return', 0):.2%}"),
        ])

    table = ax.table(
        cellText=[[m, v] for m, v in key_metrics],
        colLabels=["Metric", "Value"],
        cellLoc="center",
        loc="center",
        colWidths=[0.35, 0.2],
    )
    table.auto_set_font_size(False)
    table.set_fontsize(10)
    table.scale(1, 1.4)

    # Style header
    for (row, col), cell in table.get_celld().items():
        if row == 0:
            cell.set_facecolor("#4472C4")
            cell.set_text_props(color="white", fontweight="bold")
        elif row % 2 == 0:
            cell.set_facecolor("#D9E2F3")

    ax.set_title("Performance Summary", fontsize=13, pad=20)


def _plot_trade_analysis(
    trade_log: pd.DataFrame, title: str,
    save_dir: Path, ticker: str, model_name: str,
):
    """Analyse individual trades."""
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))

    # Trade returns distribution
    ax = axes[0]
    colors = ["green" if r > 0 else "red" for r in trade_log["return"]]
    ax.bar(range(len(trade_log)), trade_log["return"] * 100, color=colors, alpha=0.7)
    ax.axhline(0, color="black", linewidth=0.5)
    ax.set_xlabel("Trade #")
    ax.set_ylabel("Return (%)")
    ax.set_title("Individual Trade Returns", fontsize=12)

    # Trade duration distribution
    ax = axes[1]
    ax.hist(trade_log["duration_days"], bins=20, color="steelblue", alpha=0.7, edgecolor="white")
    ax.set_xlabel("Duration (days)")
    ax.set_ylabel("Count")
    ax.set_title("Trade Duration Distribution", fontsize=12)

    # Cumulative trade P&L
    ax = axes[2]
    cum_pnl = trade_log["return"].cumsum() * 100
    ax.plot(range(len(cum_pnl)), cum_pnl, color="steelblue", linewidth=1.5)
    ax.fill_between(range(len(cum_pnl)), cum_pnl, 0,
                    where=cum_pnl > 0, color="green", alpha=0.1)
    ax.fill_between(range(len(cum_pnl)), cum_pnl, 0,
                    where=cum_pnl < 0, color="red", alpha=0.1)
    ax.axhline(0, color="black", linewidth=0.5)
    ax.set_xlabel("Trade #")
    ax.set_ylabel("Cumulative P&L (%)")
    ax.set_title("Cumulative Trade P&L", fontsize=12)

    plt.suptitle(f"{title} — Trade Analysis", fontsize=14)
    plt.tight_layout()
    plt.savefig(save_dir / f"{ticker}_{model_name.lower()}_trades.png",
                bbox_inches="tight", dpi=150)
    plt.close()


def _plot_annual_returns(
    strat_ret: pd.Series, bench_ret: pd.Series,
    title: str, save_dir: Path, ticker: str, model_name: str,
):
    """Annual returns bar chart: strategy vs benchmark."""
    annual_strat = strat_ret.resample("YE").apply(lambda x: (1 + x).prod() - 1)

    fig, ax = plt.subplots(figsize=(12, 5))
    x = np.arange(len(annual_strat))
    width = 0.35

    ax.bar(x - width / 2, annual_strat.values * 100,
           width, label="Strategy", color="steelblue", alpha=0.8)

    if bench_ret is not None:
        annual_bench = bench_ret.resample("YE").apply(lambda x: (1 + x).prod() - 1)
        # Align lengths
        min_len = min(len(annual_strat), len(annual_bench))
        ax.bar(x[:min_len] + width / 2, annual_bench.values[:min_len] * 100,
               width, label="Benchmark", color="gray", alpha=0.6)

    ax.set_xticks(x)
    ax.set_xticklabels([d.year for d in annual_strat.index])
    ax.set_ylabel("Return (%)")
    ax.set_title(f"{title} — Annual Returns", fontsize=14)
    ax.legend()
    ax.axhline(0, color="black", linewidth=0.5)

    plt.tight_layout()
    plt.savefig(save_dir / f"{ticker}_{model_name.lower()}_annual_returns.png",
                bbox_inches="tight", dpi=150)
    plt.close()
