"""
Data Ingestion Module
=====================
Downloads OHLCV data for primary tickers, macro indicators, and sector ETFs
from Yahoo Finance via yfinance. Includes data quality checks and cleaning.

Usage:
    from data.ingestion import DataIngestor
    ingestor = DataIngestor()
    price_data = ingestor.fetch_all()
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import yfinance as yf

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    PRIMARY_TICKERS, MACRO_TICKERS, SECTOR_ETFS,
    START_DATE, END_DATE, RAW_DIR, BENCHMARK_TICKER
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


class DataIngestor:
    """Handles all data downloading, cleaning, and persistence."""

    def __init__(
        self,
        tickers: List[str] = PRIMARY_TICKERS,
        start: str = START_DATE,
        end: str = END_DATE,
        save_dir: Path = RAW_DIR,
    ):
        self.tickers = tickers
        self.start = start
        self.end = end
        self.save_dir = save_dir
        self.save_dir.mkdir(parents=True, exist_ok=True)

    # ── Core Download ────────────────────────────────────────────

    def _download_single(self, ticker: str) -> pd.DataFrame:
        """Download OHLCV data for a single ticker."""
        logger.info(f"Downloading {ticker} ({self.start} to {self.end})")
        df = yf.download(
            ticker,
            start=self.start,
            end=self.end,
            auto_adjust=True,   # Adjust for splits/dividends
            progress=False,
        )
        if df.empty:
            logger.warning(f"No data returned for {ticker}")
            return pd.DataFrame()

        # Flatten MultiIndex columns if present (yfinance >= 0.2.x)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.get_level_values(0)

        df.index = pd.to_datetime(df.index)
        df.index.name = "Date"
        df["Ticker"] = ticker
        return df

    def fetch_price_data(self) -> Dict[str, pd.DataFrame]:
        """Download OHLCV for all primary tickers. Returns dict of DataFrames."""
        data = {}
        for ticker in self.tickers:
            df = self._download_single(ticker)
            if not df.empty:
                df = self._clean_ohlcv(df, ticker)
                data[ticker] = df
        return data

    def fetch_macro_data(self) -> Dict[str, pd.DataFrame]:
        """Download macro indicators (VIX, TNX, S&P 500)."""
        data = {}
        for name, ticker in MACRO_TICKERS.items():
            df = self._download_single(ticker)
            if not df.empty:
                df = self._clean_ohlcv(df, name)
                data[name] = df
        return data

    def fetch_sector_etfs(self) -> Dict[str, pd.DataFrame]:
        """Download sector ETF data for relative returns."""
        data = {}
        for name, ticker in SECTOR_ETFS.items():
            df = self._download_single(ticker)
            if not df.empty:
                df = self._clean_ohlcv(df, name)
                data[name] = df
        return data

    def fetch_benchmark(self) -> pd.DataFrame:
        """Download benchmark (SPY) data."""
        df = self._download_single(BENCHMARK_TICKER)
        if not df.empty:
            df = self._clean_ohlcv(df, BENCHMARK_TICKER)
        return df

    def fetch_all(self) -> dict:
        """
        Master function: download everything and return a structured dict.

        Returns:
            {
                "prices": {ticker: df, ...},
                "macro": {name: df, ...},
                "sectors": {name: df, ...},
                "benchmark": df,
            }
        """
        logger.info("=" * 60)
        logger.info("Starting full data ingestion pipeline")
        logger.info("=" * 60)

        result = {
            "prices": self.fetch_price_data(),
            "macro": self.fetch_macro_data(),
            "sectors": self.fetch_sector_etfs(),
            "benchmark": self.fetch_benchmark(),
        }

        self._save_all(result)
        self._print_summary(result)
        return result

    # ── Cleaning ─────────────────────────────────────────────────

    def _clean_ohlcv(self, df: pd.DataFrame, ticker: str) -> pd.DataFrame:
        """
        Clean OHLCV data:
        1. Remove duplicate dates
        2. Sort by date
        3. Handle missing values (forward-fill, then back-fill residual)
        4. Flag and log data quality issues
        """
        original_len = len(df)

        # Remove duplicates
        df = df[~df.index.duplicated(keep="first")]

        # Sort chronologically
        df = df.sort_index()

        # Check for missing trading days (gaps > 5 calendar days)
        date_diffs = df.index.to_series().diff()
        large_gaps = date_diffs[date_diffs > pd.Timedelta(days=5)]
        if len(large_gaps) > 0:
            logger.warning(
                f"{ticker}: {len(large_gaps)} gaps > 5 days detected. "
                f"Largest: {large_gaps.max()}"
            )

        # Count NaN values before filling
        nan_counts = df[["Open", "High", "Low", "Close", "Volume"]].isna().sum()
        if nan_counts.sum() > 0:
            logger.warning(f"{ticker}: Missing values before fill:\n{nan_counts[nan_counts > 0]}")

        # Forward-fill then back-fill
        df[["Open", "High", "Low", "Close"]] = (
            df[["Open", "High", "Low", "Close"]].ffill().bfill()
        )
        df["Volume"] = df["Volume"].fillna(0).astype(np.int64)

        # Sanity checks
        assert (df["Close"] > 0).all(), f"{ticker}: Non-positive close prices found"
        assert (df["Volume"] >= 0).all(), f"{ticker}: Negative volume found"

        removed = original_len - len(df)
        if removed > 0:
            logger.info(f"{ticker}: Removed {removed} duplicate rows")

        return df

    # ── Persistence ──────────────────────────────────────────────

    def _save_all(self, data: dict):
        """Save all downloaded data to Parquet files."""
        # Save price data
        for ticker, df in data["prices"].items():
            path = self.save_dir / f"price_{ticker}.parquet"
            df.to_parquet(path)
            logger.info(f"Saved: {path}")

        # Save macro
        for name, df in data["macro"].items():
            path = self.save_dir / f"macro_{name}.parquet"
            df.to_parquet(path)
            logger.info(f"Saved: {path}")

        # Save sectors
        for name, df in data["sectors"].items():
            path = self.save_dir / f"sector_{name}.parquet"
            df.to_parquet(path)
            logger.info(f"Saved: {path}")

        # Save benchmark
        if data["benchmark"] is not None and not data["benchmark"].empty:
            path = self.save_dir / f"benchmark_{BENCHMARK_TICKER}.parquet"
            data["benchmark"].to_parquet(path)
            logger.info(f"Saved: {path}")

    def _print_summary(self, data: dict):
        """Print a summary of downloaded data."""
        logger.info("\n" + "=" * 60)
        logger.info("DATA INGESTION SUMMARY")
        logger.info("=" * 60)

        for ticker, df in data["prices"].items():
            logger.info(
                f"  {ticker:6s} | {df.index.min().date()} to {df.index.max().date()} "
                f"| {len(df):>5d} rows | NaN: {df.isna().sum().sum()}"
            )

        logger.info("-" * 60)
        for name, df in data["macro"].items():
            logger.info(
                f"  {name:6s} | {df.index.min().date()} to {df.index.max().date()} "
                f"| {len(df):>5d} rows"
            )

        logger.info("-" * 60)
        for name, df in data["sectors"].items():
            logger.info(
                f"  {name:6s} | {df.index.min().date()} to {df.index.max().date()} "
                f"| {len(df):>5d} rows"
            )


# ── Load Helpers ─────────────────────────────────────────────────

def load_price_data(ticker: str, data_dir: Path = RAW_DIR) -> pd.DataFrame:
    """Load previously saved price data from Parquet."""
    path = data_dir / f"price_{ticker}.parquet"
    if not path.exists():
        raise FileNotFoundError(f"No saved data for {ticker} at {path}")
    return pd.read_parquet(path)


def load_macro_data(name: str, data_dir: Path = RAW_DIR) -> pd.DataFrame:
    """Load previously saved macro data from Parquet."""
    path = data_dir / f"macro_{name}.parquet"
    if not path.exists():
        raise FileNotFoundError(f"No saved macro data for {name} at {path}")
    return pd.read_parquet(path)


def load_sector_data(name: str, data_dir: Path = RAW_DIR) -> pd.DataFrame:
    """Load previously saved sector ETF data from Parquet."""
    path = data_dir / f"sector_{name}.parquet"
    if not path.exists():
        raise FileNotFoundError(f"No saved sector data for {name} at {path}")
    return pd.read_parquet(path)


if __name__ == "__main__":
    ingestor = DataIngestor()
    data = ingestor.fetch_all()
    print("\nDone! All data saved to:", RAW_DIR)
