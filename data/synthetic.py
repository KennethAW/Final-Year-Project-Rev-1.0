"""
Synthetic Data Generator
=========================
Generates realistic OHLCV data for pipeline testing when
Yahoo Finance is unavailable.
"""

import logging
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    PRIMARY_TICKERS, MACRO_TICKERS, SECTOR_ETFS,
    START_DATE, END_DATE, RAW_DIR, BENCHMARK_TICKER, RANDOM_SEED,
)

logger = logging.getLogger(__name__)


def generate_ohlcv(
    ticker: str,
    start: str = START_DATE,
    end: str = END_DATE,
    initial_price: float = 100.0,
    daily_vol: float = 0.02,
    drift: float = 0.0003,
    seed: int = RANDOM_SEED,
) -> pd.DataFrame:
    """
    Generate synthetic OHLCV data using geometric Brownian motion.

    Parameters:
        ticker: Ticker symbol (used for seed variation)
        initial_price: Starting price
        daily_vol: Daily return volatility
        drift: Daily drift (mean return)
        seed: Random seed (hashed with ticker for variation)
    """
    # Vary seed per ticker for different price paths
    rng = np.random.RandomState(seed + hash(ticker) % 10000)

    # Create business day index
    dates = pd.bdate_range(start=start, end=end)
    n = len(dates)

    # GBM: log returns
    log_returns = rng.normal(drift, daily_vol, n)
    log_prices = np.cumsum(log_returns)
    close = initial_price * np.exp(log_prices)

    # Generate OHLV from close
    daily_range = close * rng.uniform(0.005, 0.025, n)
    high = close + daily_range * rng.uniform(0.3, 0.7, n)
    low = close - daily_range * rng.uniform(0.3, 0.7, n)
    open_price = close + daily_range * rng.uniform(-0.5, 0.5, n)

    # Ensure consistency: low <= open,close <= high
    low = np.minimum(low, np.minimum(open_price, close))
    high = np.maximum(high, np.maximum(open_price, close))

    # Volume: base volume with some noise
    base_volume = 50_000_000
    volume = (base_volume * np.abs(rng.normal(1, 0.3, n))).astype(np.int64)

    df = pd.DataFrame({
        "Open": open_price,
        "High": high,
        "Low": low,
        "Close": close,
        "Volume": volume,
        "Ticker": ticker,
    }, index=dates)
    df.index.name = "Date"

    return df


def generate_all_synthetic_data(save_dir: Path = RAW_DIR):
    """Generate and save synthetic data for all tickers in the config."""
    save_dir.mkdir(parents=True, exist_ok=True)

    # Price tickers with realistic starting prices
    price_configs = {
        "AAPL": {"initial_price": 110.0, "daily_vol": 0.018, "drift": 0.0005},
        "MSFT": {"initial_price": 50.0, "daily_vol": 0.017, "drift": 0.0006},
        "GOOGL": {"initial_price": 750.0, "daily_vol": 0.019, "drift": 0.0004},
        "JPM": {"initial_price": 60.0, "daily_vol": 0.015, "drift": 0.0003},
        "XOM": {"initial_price": 80.0, "daily_vol": 0.016, "drift": 0.0001},
    }

    for ticker in PRIMARY_TICKERS:
        cfg = price_configs.get(ticker, {"initial_price": 100.0})
        df = generate_ohlcv(ticker, **cfg)
        path = save_dir / f"price_{ticker}.parquet"
        df.to_parquet(path)
        logger.info(f"Generated synthetic: {path} ({len(df)} rows)")

    # Macro tickers
    macro_configs = {
        "VIX": {"initial_price": 15.0, "daily_vol": 0.05, "drift": 0.0},
        "TNX": {"initial_price": 2.0, "daily_vol": 0.01, "drift": 0.0001},
        "SPX": {"initial_price": 2000.0, "daily_vol": 0.012, "drift": 0.0003},
    }
    for name, yf_ticker in MACRO_TICKERS.items():
        cfg = macro_configs.get(name, {"initial_price": 100.0})
        df = generate_ohlcv(name, **cfg)
        path = save_dir / f"macro_{name}.parquet"
        df.to_parquet(path)
        logger.info(f"Generated synthetic: {path}")

    # Sector ETFs
    sector_configs = {
        "XLK": {"initial_price": 45.0, "daily_vol": 0.016},
        "XLF": {"initial_price": 25.0, "daily_vol": 0.014},
        "XLE": {"initial_price": 70.0, "daily_vol": 0.020},
        "XLV": {"initial_price": 70.0, "daily_vol": 0.013},
        "XLI": {"initial_price": 55.0, "daily_vol": 0.014},
    }
    for name in SECTOR_ETFS:
        cfg = sector_configs.get(name, {"initial_price": 50.0})
        df = generate_ohlcv(name, **cfg)
        path = save_dir / f"sector_{name}.parquet"
        df.to_parquet(path)
        logger.info(f"Generated synthetic: {path}")

    # Benchmark
    df = generate_ohlcv(BENCHMARK_TICKER, initial_price=200.0, daily_vol=0.012, drift=0.0003)
    path = save_dir / f"benchmark_{BENCHMARK_TICKER}.parquet"
    df.to_parquet(path)
    logger.info(f"Generated synthetic: {path}")

    logger.info("All synthetic data generated successfully!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generate_all_synthetic_data()
