"""
Technical Indicators Feature Engineering
=========================================
Computes a comprehensive set of technical indicators from OHLCV data.
Organised by category: Trend, Momentum, Volatility, Volume.
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def compute_technical_features(
    df: pd.DataFrame,
    sma_period: int = 20,
    ema_period: int = 50,
    rsi_period: int = 14,
    atr_period: int = 14,
    bb_period: int = 20,
    bb_std: float = 2.0,
    macd_fast: int = 12,
    macd_slow: int = 26,
    macd_signal: int = 9,
    stoch_k: int = 14,
    stoch_d: int = 3,
    roc_period: int = 10,
    adx_period: int = 14,
    volume_sma_period: int = 20,
) -> pd.DataFrame:
    """
    Compute all technical indicators and append as new columns.

    Parameters:
        df: DataFrame with columns [Open, High, Low, Close, Volume] and DatetimeIndex.
        (All period params correspond to indicator lookback windows.)

    Returns:
        DataFrame with original columns + all technical indicator columns.
    """
    df = df.copy()

    # Validate required columns
    required = {"Open", "High", "Low", "Close", "Volume"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    logger.info(f"Computing technical features for {len(df)} rows")

    # ── Trend Indicators ─────────────────────────────────────────
    df["SMA_20"] = df["Close"].rolling(window=sma_period).mean()
    df["EMA_50"] = df["Close"].ewm(span=ema_period, adjust=False).mean()

    # MACD
    ema_fast = df["Close"].ewm(span=macd_fast, adjust=False).mean()
    ema_slow = df["Close"].ewm(span=macd_slow, adjust=False).mean()
    df["MACD"] = ema_fast - ema_slow
    df["MACD_Signal"] = df["MACD"].ewm(span=macd_signal, adjust=False).mean()
    df["MACD_Hist"] = df["MACD"] - df["MACD_Signal"]

    # ADX (Average Directional Index)
    df = _compute_adx(df, period=adx_period)

    # Price relative to moving averages (normalised distance)
    df["Close_to_SMA20"] = (df["Close"] - df["SMA_20"]) / df["SMA_20"]
    df["Close_to_EMA50"] = (df["Close"] - df["EMA_50"]) / df["EMA_50"]

    # ── Momentum Indicators ──────────────────────────────────────
    # RSI
    df["RSI_14"] = _compute_rsi(df["Close"], period=rsi_period)

    # Stochastic Oscillator
    low_min = df["Low"].rolling(window=stoch_k).min()
    high_max = df["High"].rolling(window=stoch_k).max()
    df["Stoch_K"] = 100 * (df["Close"] - low_min) / (high_max - low_min + 1e-10)
    df["Stoch_D"] = df["Stoch_K"].rolling(window=stoch_d).mean()

    # Rate of Change
    df["ROC"] = df["Close"].pct_change(periods=roc_period) * 100

    # ── Volatility Indicators ────────────────────────────────────
    # Bollinger Bands
    bb_sma = df["Close"].rolling(window=bb_period).mean()
    bb_rolling_std = df["Close"].rolling(window=bb_period).std()
    df["BB_Upper"] = bb_sma + bb_std * bb_rolling_std
    df["BB_Lower"] = bb_sma - bb_std * bb_rolling_std
    df["BB_Width"] = (df["BB_Upper"] - df["BB_Lower"]) / bb_sma
    df["BB_PctB"] = (df["Close"] - df["BB_Lower"]) / (df["BB_Upper"] - df["BB_Lower"] + 1e-10)

    # ATR (Average True Range)
    df["ATR_14"] = _compute_atr(df, period=atr_period)

    # Normalised ATR (relative to close price)
    df["ATR_Pct"] = df["ATR_14"] / df["Close"]

    # ── Volume Indicators ────────────────────────────────────────
    # On-Balance Volume
    df["OBV"] = _compute_obv(df)

    # Volume SMA ratio
    vol_sma = df["Volume"].rolling(window=volume_sma_period).mean()
    df["Volume_SMA_Ratio"] = df["Volume"] / (vol_sma + 1e-10)

    # ── Return Features (useful as auxiliary inputs) ─────────────
    df["Return_1d"] = df["Close"].pct_change(1)
    df["Return_5d"] = df["Close"].pct_change(5)
    df["Return_20d"] = df["Close"].pct_change(20)
    df["Log_Return_1d"] = np.log(df["Close"] / df["Close"].shift(1))

    # Realised volatility (20-day rolling std of daily returns)
    df["RealVol_20d"] = df["Return_1d"].rolling(window=20).std() * np.sqrt(252)

    # Count features added
    original_cols = {"Open", "High", "Low", "Close", "Volume", "Ticker"}
    new_cols = set(df.columns) - original_cols
    logger.info(f"Added {len(new_cols)} technical features")

    return df


# ── Helper Functions (pure pandas, no ta-lib dependency) ─────────

def _compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Compute RSI using exponential moving average of gains/losses."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _compute_atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    """Compute Average True Range."""
    high_low = df["High"] - df["Low"]
    high_close = (df["High"] - df["Close"].shift(1)).abs()
    low_close = (df["Low"] - df["Close"].shift(1)).abs()

    true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    atr = true_range.rolling(window=period).mean()
    return atr


def _compute_adx(df: pd.DataFrame, period: int = 14) -> pd.DataFrame:
    """Compute Average Directional Index (ADX)."""
    high_diff = df["High"].diff()
    low_diff = -df["Low"].diff()

    plus_dm = pd.Series(np.where((high_diff > low_diff) & (high_diff > 0), high_diff, 0),
                        index=df.index)
    minus_dm = pd.Series(np.where((low_diff > high_diff) & (low_diff > 0), low_diff, 0),
                         index=df.index)

    atr = _compute_atr(df, period)

    plus_di = 100 * (plus_dm.rolling(window=period).mean() / (atr + 1e-10))
    minus_di = 100 * (minus_dm.rolling(window=period).mean() / (atr + 1e-10))

    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di + 1e-10)
    df["ADX"] = dx.rolling(window=period).mean()
    df["Plus_DI"] = plus_di
    df["Minus_DI"] = minus_di

    return df


def _compute_obv(df: pd.DataFrame) -> pd.Series:
    """Compute On-Balance Volume."""
    sign = np.sign(df["Close"].diff())
    obv = (sign * df["Volume"]).cumsum()
    return obv


def get_technical_feature_names() -> list:
    """Return list of all technical feature column names (for reference)."""
    return [
        # Trend
        "SMA_20", "EMA_50", "MACD", "MACD_Signal", "MACD_Hist",
        "ADX", "Plus_DI", "Minus_DI", "Close_to_SMA20", "Close_to_EMA50",
        # Momentum
        "RSI_14", "Stoch_K", "Stoch_D", "ROC",
        # Volatility
        "BB_Upper", "BB_Lower", "BB_Width", "BB_PctB",
        "ATR_14", "ATR_Pct",
        # Volume
        "OBV", "Volume_SMA_Ratio",
        # Returns
        "Return_1d", "Return_5d", "Return_20d", "Log_Return_1d", "RealVol_20d",
    ]
