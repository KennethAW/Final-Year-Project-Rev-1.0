"""
Backtesting Engine
===================
Vectorised backtesting engine that converts model predictions into
a tradeable strategy and computes financial performance metrics.
"""

import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    TRANSACTION_COST_BPS, CONFIDENCE_THRESHOLD,
    RESULTS_DIR, RAW_DIR, BENCHMARK_TICKER,
)

logger = logging.getLogger(__name__)


class Backtester:
    """Vectorised backtesting engine with configurable risk management."""

    def __init__(
        self,
        confidence_threshold: float = CONFIDENCE_THRESHOLD,
        transaction_cost_bps: float = TRANSACTION_COST_BPS,
        stop_loss_pct: float = 0.03,       # 3% stop loss
        take_profit_pct: float = 0.05,     # 5% take profit
        max_position_size: float = 1.0,    # Max fraction of capital per trade
        risk_free_rate: float = 0.04,      # Annual risk-free rate (~4%)
    ):
        self.confidence_threshold = confidence_threshold
        self.tc = transaction_cost_bps / 10_000
        self.stop_loss = stop_loss_pct
        self.take_profit = take_profit_pct
        self.max_position_size = max_position_size
        self.risk_free_rate = risk_free_rate

    def run(
        self,
        predictions: pd.DataFrame,
        prices: pd.DataFrame,
        benchmark: Optional[pd.DataFrame] = None,
    ) -> dict:
        """
        Execute backtest from model predictions.

        Parameters:
            predictions: DataFrame with columns:
                - pred_direction (int 0/1)
                - pred_prob_up (float, confidence)
                - pred_log_return (float, predicted magnitude)
                - Target_Direction (int, actual)
                - Target_LogReturn (float, actual)
            prices: Raw OHLCV DataFrame aligned to prediction dates.
            benchmark: Optional benchmark OHLCV for comparison.

        Returns:
            Dict with strategy returns, metrics, trade log, etc.
        """
        logger.info(f"Running backtest: {len(predictions)} trading days")

        # Align data
        common_dates = predictions.index.intersection(prices.index)
        pred = predictions.loc[common_dates].copy()
        px = prices.loc[common_dates].copy()

        if len(pred) == 0:
            logger.error("No overlapping dates between predictions and prices")
            return {}

        # ── Signal Generation ────────────────────────────────────
        pred["signal"] = self._generate_signals(pred)

        # ── Position Sizing ──────────────────────────────────────
        pred["position_size"] = self._size_positions(pred)

        # ── Strategy Returns ─────────────────────────────────────
        daily_returns = px["Close"].pct_change().shift(-1)
        pred["market_return"] = daily_returns

        pred["position_change"] = pred["signal"].diff().abs().fillna(0)
        pred["transaction_cost"] = pred["position_change"] * self.tc

        pred["strategy_return"] = (
            pred["signal"] * pred["position_size"] * pred["market_return"]
            - pred["transaction_cost"]
        )

        # Apply stop-loss and take-profit
        pred = self._apply_risk_management(pred)

        # Drop last row (no next-day return available)
        pred = pred.iloc[:-1]

        # ── Benchmark ────────────────────────────────────────────
        bench_returns = None
        if benchmark is not None:
            bench_aligned = benchmark["Close"].reindex(pred.index).pct_change()
            bench_returns = bench_aligned
            pred["benchmark_return"] = bench_returns
        else:
            pred["benchmark_return"] = pred["market_return"]
            bench_returns = pred["benchmark_return"]

        # ── Compute Metrics ──────────────────────────────────────
        strat_returns = pred["strategy_return"].fillna(0)
        metrics = self._compute_all_metrics(strat_returns, bench_returns)

        # ── Trade Log ────────────────────────────────────────────
        trade_log = self._build_trade_log(pred)

        # ── Cumulative Returns ───────────────────────────────────
        pred["cum_strategy"] = (1 + strat_returns).cumprod()
        pred["cum_benchmark"] = (1 + pred["benchmark_return"].fillna(0)).cumprod()

        results = {
            "daily_data": pred,
            "metrics": metrics,
            "trade_log": trade_log,
            "strategy_returns": strat_returns,
            "benchmark_returns": bench_returns,
        }

        self._print_summary(metrics)
        return results

    # ── Signal Generation ────────────────────────────────────────

    def _generate_signals(self, pred: pd.DataFrame) -> pd.Series:
        """
        Generate trading signals:
        +1 = Long  (model predicts Up with sufficient confidence)
         0 = Flat  (no position)
        """
        signal = pd.Series(0, index=pred.index, dtype=int)

        long_mask = (
            (pred["pred_direction"] == 1) &
            (pred["pred_prob_up"] >= self.confidence_threshold)
        )
        signal[long_mask] = 1

        logger.info(
            f"Signals: Long {long_mask.sum()} days "
            f"({100 * long_mask.mean():.1f}%), "
            f"Flat {(~long_mask).sum()} days"
        )
        return signal

    # ── Position Sizing ──────────────────────────────────────────

    def _size_positions(self, pred: pd.DataFrame) -> pd.Series:
        """
        Position size proportional to predicted return magnitude.
        Scaled to [0, max_position_size].
        """
        if "pred_log_return" not in pred.columns:
            return pd.Series(1.0, index=pred.index)

        raw_size = pred["pred_log_return"].abs()
        if raw_size.max() > 0:
            normalised = raw_size / max(raw_size.quantile(0.95), 1e-8)
            normalised = normalised.clip(0, 1)
        else:
            normalised = pd.Series(1.0, index=pred.index)

        return normalised * self.max_position_size

    # ── Risk Management ──────────────────────────────────────────

    def _apply_risk_management(self, pred: pd.DataFrame) -> pd.DataFrame:
        """Apply stop-loss and take-profit to strategy returns."""
        cum_trade_return = 0.0
        adjusted_returns = pred["strategy_return"].copy()

        for i in range(len(pred)):
            if pred["signal"].iloc[i] == 0:
                cum_trade_return = 0.0
                continue

            cum_trade_return += adjusted_returns.iloc[i]

            # Stop loss
            if cum_trade_return < -self.stop_loss:
                adjusted_returns.iloc[i] = adjusted_returns.iloc[i]  # Keep the loss
                pred.iloc[i, pred.columns.get_loc("signal")] = 0     # Exit
                cum_trade_return = 0.0

            # Take profit
            elif cum_trade_return > self.take_profit:
                adjusted_returns.iloc[i] = adjusted_returns.iloc[i]
                pred.iloc[i, pred.columns.get_loc("signal")] = 0
                cum_trade_return = 0.0

        pred["strategy_return"] = adjusted_returns
        return pred

    # ── Metrics ──────────────────────────────────────────────────

    def _compute_all_metrics(
        self,
        strategy_returns: pd.Series,
        benchmark_returns: Optional[pd.Series] = None,
    ) -> dict:
        """Compute all financial metrics from the FYP spec."""
        from evaluation.metrics import compute_financial_metrics

        metrics = compute_financial_metrics(
            strategy_returns,
            benchmark_returns=benchmark_returns,
            risk_free_rate=self.risk_free_rate,
        )

        # Add strategy-specific stats
        metrics["total_trading_days"] = len(strategy_returns)
        metrics["days_in_market"] = (strategy_returns != 0).sum()
        metrics["market_exposure"] = (strategy_returns != 0).mean()

        return metrics

    # ── Trade Log ────────────────────────────────────────────────

    def _build_trade_log(self, pred: pd.DataFrame) -> pd.DataFrame:
        """Extract individual trades from the signal series."""
        trades = []
        in_trade = False
        entry_date = None
        entry_cum_return = 0.0

        for i in range(len(pred)):
            signal = pred["signal"].iloc[i]
            date = pred.index[i]

            if signal == 1 and not in_trade:
                # Trade entry
                in_trade = True
                entry_date = date
                entry_cum_return = 0.0

            if in_trade:
                entry_cum_return += pred["strategy_return"].iloc[i]

            if signal == 0 and in_trade:
                # Trade exit
                trades.append({
                    "entry_date": entry_date,
                    "exit_date": date,
                    "duration_days": (date - entry_date).days,
                    "return": entry_cum_return,
                    "profitable": entry_cum_return > 0,
                })
                in_trade = False

        if not trades:
            return pd.DataFrame(columns=[
                "entry_date", "exit_date", "duration_days", "return", "profitable"
            ])

        trade_df = pd.DataFrame(trades)
        logger.info(
            f"Trades: {len(trade_df)} total, "
            f"{trade_df['profitable'].mean():.1%} win rate, "
            f"avg return: {trade_df['return'].mean():.4f}"
        )
        return trade_df

    # ── Summary ──────────────────────────────────────────────────

    @staticmethod
    def _print_summary(metrics: dict):
        """Pretty-print backtest results."""
        logger.info(f"\n{'─'*55}")
        logger.info(f"  BACKTEST RESULTS")
        logger.info(f"{'─'*55}")
        fmt = {
            "total_return": ("Total Return", "{:.2%}"),
            "annualised_return": ("Annualised Return", "{:.2%}"),
            "annualised_volatility": ("Annualised Volatility", "{:.2%}"),
            "sharpe_ratio": ("Sharpe Ratio", "{:.4f}"),
            "sortino_ratio": ("Sortino Ratio", "{:.4f}"),
            "max_drawdown": ("Max Drawdown", "{:.2%}"),
            "calmar_ratio": ("Calmar Ratio", "{:.4f}"),
            "win_rate": ("Win Rate", "{:.2%}"),
            "profit_factor": ("Profit Factor", "{:.4f}"),
            "market_exposure": ("Market Exposure", "{:.2%}"),
        }
        for key, (label, f) in fmt.items():
            if key in metrics:
                logger.info(f"  {label:25s}: {f.format(metrics[key])}")

        if "benchmark_ann_return" in metrics:
            logger.info(f"  {'Benchmark Ann. Return':25s}: {metrics['benchmark_ann_return']:.2%}")
            logger.info(f"  {'Excess Return':25s}: {metrics.get('excess_return', 0):.2%}")

        logger.info(f"{'─'*55}")
