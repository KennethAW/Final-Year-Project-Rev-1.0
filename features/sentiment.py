"""
Sentiment Feature Engineering
==============================
Extracts daily sentiment scores from financial news headlines using FinBERT.
Produces rolling sentiment aggregates per ticker.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class SentimentPipeline:
    """FinBERT-based sentiment feature extraction pipeline."""

    def __init__(
        self,
        model_name: str = "ProsusAI/finbert",
        rolling_windows: List[int] = [3, 7],
        batch_size: int = 32,
        device: Optional[str] = None,
    ):
        self.model_name = model_name
        self.rolling_windows = rolling_windows
        self.batch_size = batch_size
        self._pipeline = None
        self.device = device

    def _load_model(self):
        """Lazy-load FinBERT model (only when first needed)."""
        if self._pipeline is not None:
            return

        logger.info(f"Loading FinBERT model: {self.model_name}")
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline

            self._pipeline = pipeline(
                "sentiment-analysis",
                model=self.model_name,
                tokenizer=self.model_name,
                device=self.device,
                truncation=True,
                max_length=512,
            )
            logger.info("FinBERT model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load FinBERT: {e}")
            logger.warning("Sentiment features will use placeholder values (0.0)")
            self._pipeline = None

    def fetch_headlines(self, ticker: str) -> pd.DataFrame:
        """
        Fetch news headlines for a ticker via yfinance.

        Returns:
            DataFrame with columns: [date, headline, source]
        """
        import yfinance as yf

        logger.info(f"Fetching news headlines for {ticker}")
        stock = yf.Ticker(ticker)

        try:
            news = stock.news
        except Exception as e:
            logger.warning(f"Failed to fetch news for {ticker}: {e}")
            return pd.DataFrame(columns=["date", "headline", "source"])

        if not news:
            logger.warning(f"No news found for {ticker}")
            return pd.DataFrame(columns=["date", "headline", "source"])

        records = []
        for item in news:
            # yfinance news items have varying structures across versions
            title = item.get("title", item.get("headline", ""))
            pub_date = item.get("providerPublishTime", item.get("publishedAt", None))
            source = item.get("publisher", item.get("source", "unknown"))

            if title and pub_date:
                if isinstance(pub_date, (int, float)):
                    pub_date = datetime.fromtimestamp(pub_date)
                elif isinstance(pub_date, str):
                    pub_date = pd.to_datetime(pub_date)

                records.append({
                    "date": pd.Timestamp(pub_date).normalize(),  # Date only
                    "headline": title,
                    "source": source,
                })

        df = pd.DataFrame(records)
        logger.info(f"Fetched {len(df)} headlines for {ticker}")
        return df

    def score_headlines(self, headlines: List[str]) -> List[dict]:
        """
        Score a list of headlines with FinBERT.

        Returns:
            List of dicts with keys: [label, score]
            label is one of: 'positive', 'negative', 'neutral'
        """
        self._load_model()

        if self._pipeline is None:
            # Fallback: return neutral scores
            return [{"label": "neutral", "score": 0.5} for _ in headlines]

        if not headlines:
            return []

        # Process in batches
        results = []
        for i in range(0, len(headlines), self.batch_size):
            batch = headlines[i : i + self.batch_size]
            batch_results = self._pipeline(batch)
            results.extend(batch_results)

        return results

    def compute_daily_sentiment(self, headlines_df: pd.DataFrame) -> pd.DataFrame:
        """
        Aggregate headline-level sentiment to daily scores.

        Returns:
            DataFrame indexed by date with columns:
            [sentiment_mean, sentiment_positive, sentiment_negative,
             sentiment_neutral, headline_count]
        """
        if headlines_df.empty:
            return pd.DataFrame(
                columns=["sentiment_mean", "sentiment_positive", "sentiment_negative",
                         "sentiment_neutral", "headline_count"]
            )

        # Score all headlines
        scores = self.score_headlines(headlines_df["headline"].tolist())

        # Map labels to numeric: positive=+1, negative=-1, neutral=0
        label_map = {"positive": 1.0, "negative": -1.0, "neutral": 0.0}

        headlines_df = headlines_df.copy()
        headlines_df["sentiment_label"] = [s["label"] for s in scores]
        headlines_df["sentiment_confidence"] = [s["score"] for s in scores]
        headlines_df["sentiment_numeric"] = headlines_df["sentiment_label"].map(label_map)

        # Weighted sentiment: label * confidence
        headlines_df["weighted_sentiment"] = (
            headlines_df["sentiment_numeric"] * headlines_df["sentiment_confidence"]
        )

        # Aggregate to daily
        daily = headlines_df.groupby("date").agg(
            sentiment_mean=("weighted_sentiment", "mean"),
            sentiment_positive=("sentiment_label", lambda x: (x == "positive").mean()),
            sentiment_negative=("sentiment_label", lambda x: (x == "negative").mean()),
            sentiment_neutral=("sentiment_label", lambda x: (x == "neutral").mean()),
            headline_count=("headline", "count"),
        )

        return daily

    def compute_sentiment_features(
        self,
        ticker: str,
        date_index: pd.DatetimeIndex,
    ) -> pd.DataFrame:
        """
        Full pipeline: fetch headlines → score → aggregate → rolling features.

        Parameters:
            ticker: Stock ticker symbol
            date_index: DatetimeIndex of the price data to align sentiment to

        Returns:
            DataFrame aligned to date_index with sentiment features.
            Missing days are forward-filled then filled with 0.
        """
        # Fetch and score
        headlines_df = self.fetch_headlines(ticker)
        daily_sentiment = self.compute_daily_sentiment(headlines_df)

        # Reindex to match price data dates
        result = daily_sentiment.reindex(date_index)

        # Forward-fill sentiment (news persists for a few days)
        result = result.ffill(limit=3)

        # Fill remaining NaN with neutral (0)
        result = result.fillna(0.0)

        # Add rolling features
        for window in self.rolling_windows:
            result[f"sentiment_roll_{window}d"] = (
                result["sentiment_mean"].rolling(window=window, min_periods=1).mean()
            )
            result[f"sentiment_std_{window}d"] = (
                result["sentiment_mean"].rolling(window=window, min_periods=1).std().fillna(0)
            )

        logger.info(
            f"Sentiment features for {ticker}: "
            f"{len(daily_sentiment)} days with headlines out of {len(date_index)} trading days "
            f"({100 * len(daily_sentiment) / max(len(date_index), 1):.1f}% coverage)"
        )

        return result


def create_placeholder_sentiment(date_index: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Create placeholder (all-zero) sentiment features when FinBERT is unavailable.
    Useful for initial development and testing without GPU.
    """
    columns = [
        "sentiment_mean", "sentiment_positive", "sentiment_negative",
        "sentiment_neutral", "headline_count",
        "sentiment_roll_3d", "sentiment_std_3d",
        "sentiment_roll_7d", "sentiment_std_7d",
    ]
    return pd.DataFrame(0.0, index=date_index, columns=columns)


def get_sentiment_feature_names() -> list:
    """Return list of all sentiment feature column names."""
    return [
        "sentiment_mean", "sentiment_positive", "sentiment_negative",
        "sentiment_neutral", "headline_count",
        "sentiment_roll_3d", "sentiment_std_3d",
        "sentiment_roll_7d", "sentiment_std_7d",
    ]
