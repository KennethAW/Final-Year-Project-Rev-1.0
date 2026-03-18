"""
Macro / Market Regime Feature Engineering
==========================================
Constructs features from VIX, Treasury yields, S&P 500 returns,
and sector ETF relative performance.
"""

import logging
from typing import Dict, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def compute_macro_features(
    macro_data: Dict[str, pd.DataFrame],
    sector_data: Dict[str, pd.DataFrame],
    date_index: pd.DatetimeIndex,
) -> pd.DataFrame:
    """
    Compute macro and market regime features aligned to the given date index.

    Parameters:
        macro_data: Dict with keys 'VIX', 'TNX', 'SPX', each containing
                    a DataFrame with at least a 'Close' column.
        sector_data: Dict with sector ETF names as keys.
        date_index: DatetimeIndex to align all features to.

    Returns:
        DataFrame with macro features, indexed by date.
    """
    result = pd.DataFrame(index=date_index)
    logger.info(f"Computing macro features for {len(date_index)} trading days")

    # ── VIX Features ─────────────────────────────────────────────
    if "VIX" in macro_data:
        vix = macro_data["VIX"]["Close"].reindex(date_index).ffill().bfill()
        result["VIX"] = vix
        result["VIX_MA5"] = vix.rolling(5).mean()
        result["VIX_MA20"] = vix.rolling(20).mean()
        result["VIX_Change"] = vix.pct_change()

        # VIX regime: high volatility if VIX > 20
        result["VIX_High"] = (vix > 20).astype(int)
        # VIX term structure proxy (short MA vs long MA)
        result["VIX_TermStructure"] = result["VIX_MA5"] / (result["VIX_MA20"] + 1e-10)
        logger.info("  Added VIX features")

    # ── Treasury Yield Features ──────────────────────────────────
    if "TNX" in macro_data:
        tnx = macro_data["TNX"]["Close"].reindex(date_index).ffill().bfill()
        result["TNX_Yield"] = tnx
        result["TNX_Change"] = tnx.diff()          # Absolute change in yield
        result["TNX_MA20"] = tnx.rolling(20).mean()
        result["TNX_Spread"] = tnx - result["TNX_MA20"]  # Deviation from trend
        logger.info("  Added Treasury yield features")

    # ── S&P 500 Market Features ──────────────────────────────────
    if "SPX" in macro_data:
        spx = macro_data["SPX"]["Close"].reindex(date_index).ffill().bfill()
        result["SPX_Return_1d"] = spx.pct_change()
        result["SPX_Return_5d"] = spx.pct_change(5)
        result["SPX_Return_20d"] = spx.pct_change(20)
        result["SPX_MA50"] = spx.rolling(50).mean()
        result["SPX_Above_MA50"] = (spx > result["SPX_MA50"]).astype(int)

        # Market breadth proxy: rolling return z-score
        roll_mean = result["SPX_Return_1d"].rolling(20).mean()
        roll_std = result["SPX_Return_1d"].rolling(20).std()
        result["SPX_ZScore"] = (result["SPX_Return_1d"] - roll_mean) / (roll_std + 1e-10)
        logger.info("  Added S&P 500 features")

    # ── Sector ETF Relative Returns ──────────────────────────────
    if sector_data:
        # Compute daily returns for each sector
        sector_returns = {}
        for name, df in sector_data.items():
            close = df["Close"].reindex(date_index).ffill().bfill()
            sector_returns[name] = close.pct_change()
            result[f"Sector_{name}_Return"] = sector_returns[name]

        # Relative performance: sector return minus SPX return
        if "SPX_Return_1d" in result.columns:
            for name in sector_data:
                result[f"Sector_{name}_RelReturn"] = (
                    result[f"Sector_{name}_Return"] - result["SPX_Return_1d"]
                )

        # Sector momentum (5-day rolling return)
        for name, df in sector_data.items():
            close = df["Close"].reindex(date_index).ffill().bfill()
            result[f"Sector_{name}_Mom5d"] = close.pct_change(5)

        logger.info(f"  Added features for {len(sector_data)} sector ETFs")

    # ── Market Regime Classification ─────────────────────────────
    # Simple regime: based on VIX level and SPX trend
    if "VIX" in result.columns and "SPX_Above_MA50" in result.columns:
        # Regime: 0=calm bull, 1=volatile bull, 2=calm bear, 3=volatile bear
        result["Market_Regime"] = (
            result["VIX_High"] * 2 + (1 - result["SPX_Above_MA50"])
        ).astype(int)
        logger.info("  Added market regime classification")

    # Forward-fill any remaining NaN at the start
    result = result.ffill().bfill()

    n_features = len(result.columns)
    logger.info(f"Total macro features: {n_features}")

    return result


def get_macro_feature_names() -> list:
    """Return list of core macro feature column names (excluding dynamic sector names)."""
    return [
        # VIX
        "VIX", "VIX_MA5", "VIX_MA20", "VIX_Change", "VIX_High", "VIX_TermStructure",
        # Treasury
        "TNX_Yield", "TNX_Change", "TNX_MA20", "TNX_Spread",
        # SPX
        "SPX_Return_1d", "SPX_Return_5d", "SPX_Return_20d",
        "SPX_MA50", "SPX_Above_MA50", "SPX_ZScore",
        # Regime
        "Market_Regime",
    ]
