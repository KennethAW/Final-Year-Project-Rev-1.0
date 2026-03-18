"""
Feature Integration Pipeline
==============================
Combines technical, sentiment, and macro features into a single
model-ready DataFrame. Handles preprocessing, target creation,
and chronological train/val/test splitting.
"""

import logging
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    PRIMARY_TICKERS, TRAIN_RATIO, VAL_RATIO, TEST_RATIO,
    RAW_DIR, PROCESSED_DIR, FEATURES_DIR, RANDOM_SEED,
)
from data.ingestion import load_price_data, load_macro_data, load_sector_data
from features.technical import compute_technical_features
from features.sentiment import SentimentPipeline, create_placeholder_sentiment
from features.macro import compute_macro_features

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


class FeaturePipeline:
    """
    End-to-end feature pipeline: load raw data → compute features →
    create targets → split → scale → save.
    """

    def __init__(
        self,
        use_sentiment: bool = False,  # Set True when FinBERT is available
        data_dir: Path = RAW_DIR,
        output_dir: Path = FEATURES_DIR,
    ):
        self.use_sentiment = use_sentiment
        self.data_dir = data_dir
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

        if use_sentiment:
            self.sentiment_pipeline = SentimentPipeline()
        else:
            self.sentiment_pipeline = None

    def run(self, ticker: str) -> Dict[str, pd.DataFrame]:
        """
        Execute the full feature pipeline for a single ticker.

        Returns:
            Dict with keys: 'train', 'val', 'test', each containing
            a preprocessed DataFrame ready for model input.
            Also includes 'feature_names' and 'target_names'.
        """
        logger.info(f"\n{'='*60}")
        logger.info(f"Running feature pipeline for {ticker}")
        logger.info(f"{'='*60}")

        # 1. Load raw data
        price_df = load_price_data(ticker, self.data_dir)
        date_index = price_df.index

        # 2. Compute technical features
        df = compute_technical_features(price_df)

        # 3. Compute sentiment features
        if self.use_sentiment and self.sentiment_pipeline:
            sentiment_df = self.sentiment_pipeline.compute_sentiment_features(
                ticker=ticker, date_index=date_index
            )
        else:
            logger.info("Using placeholder sentiment features (FinBERT not enabled)")
            sentiment_df = create_placeholder_sentiment(date_index)

        # 4. Compute macro features
        macro_data = {}
        for name in ["VIX", "TNX", "SPX"]:
            try:
                macro_data[name] = load_macro_data(name, self.data_dir)
            except FileNotFoundError:
                logger.warning(f"Macro data for {name} not found, skipping")

        sector_data = {}
        for name in ["XLK", "XLF", "XLE", "XLV", "XLI"]:
            try:
                sector_data[name] = load_sector_data(name, self.data_dir)
            except FileNotFoundError:
                logger.warning(f"Sector data for {name} not found, skipping")

        macro_df = compute_macro_features(macro_data, sector_data, date_index)

        # 5. Merge all features
        df = df.join(sentiment_df, how="left")
        df = df.join(macro_df, how="left")

        # 6. Create targets
        df = self._create_targets(df)

        # 7. Drop initial NaN rows (from lookback calculations)
        initial_len = len(df)
        df = df.dropna(subset=["Target_Direction", "Target_LogReturn"])
        # Also drop rows where too many features are NaN
        feature_cols = [c for c in df.columns
                       if c not in ["Open", "High", "Low", "Close", "Volume", "Ticker",
                                    "Target_Direction", "Target_LogReturn"]]
        df = df.dropna(subset=feature_cols, thresh=int(len(feature_cols) * 0.8))
        dropped = initial_len - len(df)
        logger.info(f"Dropped {dropped} rows with insufficient data (from lookback warmup)")

        # 8. Chronological split
        train_df, val_df, test_df = self._chronological_split(df)

        # 9. Scale features (fit on train only)
        feature_cols = [c for c in df.columns
                       if c not in ["Open", "High", "Low", "Close", "Volume", "Ticker",
                                    "Target_Direction", "Target_LogReturn"]]

        train_df, val_df, test_df, scaler = self._scale_features(
            train_df, val_df, test_df, feature_cols
        )

        # 10. Save
        self._save(ticker, train_df, val_df, test_df)

        # Summary
        self._print_summary(ticker, train_df, val_df, test_df, feature_cols)

        return {
            "train": train_df,
            "val": val_df,
            "test": test_df,
            "feature_names": feature_cols,
            "target_names": ["Target_Direction", "Target_LogReturn"],
            "scaler": scaler,
        }

    def run_all(self, tickers: list = PRIMARY_TICKERS) -> Dict[str, dict]:
        """Run the pipeline for all primary tickers."""
        results = {}
        for ticker in tickers:
            try:
                results[ticker] = self.run(ticker)
            except Exception as e:
                logger.error(f"Pipeline failed for {ticker}: {e}")
        return results

    # ── Target Creation ──────────────────────────────────────────

    @staticmethod
    def _create_targets(df: pd.DataFrame) -> pd.DataFrame:
        """
        Create prediction targets:
        1. Classification: next-day return direction (1=Up, 0=Down)
        2. Regression: next-day log return
        """
        df = df.copy()

        # Next-day log return (shift -1 = look ahead by 1 day)
        df["Target_LogReturn"] = np.log(df["Close"].shift(-1) / df["Close"])

        # Binary direction: 1 if next close > current close
        df["Target_Direction"] = (df["Close"].shift(-1) > df["Close"]).astype(int)

        # Remove last row (no target available)
        df = df.iloc[:-1]

        return df

    # ── Chronological Split ──────────────────────────────────────

    @staticmethod
    def _chronological_split(
        df: pd.DataFrame,
        train_ratio: float = TRAIN_RATIO,
        val_ratio: float = VAL_RATIO,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Split data chronologically (NO shuffling).
        This is critical to prevent look-ahead bias.
        """
        n = len(df)
        train_end = int(n * train_ratio)
        val_end = int(n * (train_ratio + val_ratio))

        train = df.iloc[:train_end].copy()
        val = df.iloc[train_end:val_end].copy()
        test = df.iloc[val_end:].copy()

        logger.info(
            f"Split: Train {len(train)} ({train.index.min().date()} to {train.index.max().date()}) | "
            f"Val {len(val)} ({val.index.min().date()} to {val.index.max().date()}) | "
            f"Test {len(test)} ({test.index.min().date()} to {test.index.max().date()})"
        )

        return train, val, test

    # ── Feature Scaling ──────────────────────────────────────────

    @staticmethod
    def _scale_features(
        train: pd.DataFrame,
        val: pd.DataFrame,
        test: pd.DataFrame,
        feature_cols: list,
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, RobustScaler]:
        """
        Scale features using RobustScaler (fitted on training data ONLY).
        RobustScaler is preferred as it's robust to outliers common in financial data.
        """
        scaler = RobustScaler()

        # Fit on training data only
        train[feature_cols] = scaler.fit_transform(train[feature_cols])

        # Transform val and test using the SAME scaler
        val[feature_cols] = scaler.transform(val[feature_cols])
        test[feature_cols] = scaler.transform(test[feature_cols])

        logger.info(f"Scaled {len(feature_cols)} features with RobustScaler (fit on train only)")

        return train, val, test, scaler

    # ── Persistence ──────────────────────────────────────────────

    def _save(
        self,
        ticker: str,
        train: pd.DataFrame,
        val: pd.DataFrame,
        test: pd.DataFrame,
    ):
        """Save processed datasets to Parquet."""
        for name, df in [("train", train), ("val", val), ("test", test)]:
            path = self.output_dir / f"{ticker}_{name}.parquet"
            df.to_parquet(path)
            logger.info(f"Saved: {path}")

    # ── Summary ──────────────────────────────────────────────────

    @staticmethod
    def _print_summary(
        ticker: str,
        train: pd.DataFrame,
        val: pd.DataFrame,
        test: pd.DataFrame,
        feature_cols: list,
    ):
        """Print a clean summary of the processed dataset."""
        logger.info(f"\n{'─'*60}")
        logger.info(f"PIPELINE SUMMARY: {ticker}")
        logger.info(f"{'─'*60}")
        logger.info(f"  Features: {len(feature_cols)}")
        logger.info(f"  Train:  {len(train):>5d} rows  |  Up: {train['Target_Direction'].mean():.1%}")
        logger.info(f"  Val:    {len(val):>5d} rows  |  Up: {val['Target_Direction'].mean():.1%}")
        logger.info(f"  Test:   {len(test):>5d} rows  |  Up: {test['Target_Direction'].mean():.1%}")
        logger.info(f"  Total:  {len(train) + len(val) + len(test):>5d} rows")
        logger.info(f"{'─'*60}\n")


# ── Convenience Loaders ──────────────────────────────────────────

def load_processed_data(
    ticker: str,
    split: str = "train",
    features_dir: Path = FEATURES_DIR,
) -> pd.DataFrame:
    """Load a previously processed and saved dataset."""
    path = features_dir / f"{ticker}_{split}.parquet"
    if not path.exists():
        raise FileNotFoundError(f"Processed data not found: {path}")
    return pd.read_parquet(path)


if __name__ == "__main__":
    pipeline = FeaturePipeline(use_sentiment=False)
    results = pipeline.run_all()
    print("\nPipeline complete for all tickers!")
