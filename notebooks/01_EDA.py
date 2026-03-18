"""
Exploratory Data Analysis
===========================
Generates price overview, return distributions, technical indicator plots,
correlation analysis, and target distribution visualisations.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import seaborn as sns
from scipy import stats

from configs.config import PRIMARY_TICKERS, RAW_DIR, FEATURES_DIR, TRAIN_RATIO, VAL_RATIO
from data.ingestion import load_price_data

# ── Setup ────────────────────────────────────────────────────────
sns.set_theme(style="whitegrid", font_scale=1.1)
plt.rcParams["figure.dpi"] = 120
plt.rcParams["figure.figsize"] = (14, 6)

EDA_DIR = PROJECT_ROOT / "evaluation" / "results" / "eda"
EDA_DIR.mkdir(parents=True, exist_ok=True)


def load_all_prices():
    """Load raw price data for all primary tickers."""
    data = {}
    for ticker in PRIMARY_TICKERS:
        try:
            data[ticker] = load_price_data(ticker)
        except FileNotFoundError:
            print(f"Warning: No data for {ticker}")
    return data


def load_all_features():
    """Load processed feature data for all primary tickers."""
    data = {}
    for ticker in PRIMARY_TICKERS:
        splits = {}
        for split in ["train", "val", "test"]:
            path = FEATURES_DIR / f"{ticker}_{split}.parquet"
            if path.exists():
                splits[split] = pd.read_parquet(path)
        if splits:
            data[ticker] = splits
    return data


# ═══════════════════════════════════════════════════════════════════
# SECTION 1: Price Overview
# ═══════════════════════════════════════════════════════════════════

def plot_price_overview(price_data: dict):
    """Plot normalised price series for all tickers."""
    fig, axes = plt.subplots(2, 1, figsize=(14, 10))

    # Normalised prices (base=100)
    ax = axes[0]
    for ticker, df in price_data.items():
        normalised = 100 * df["Close"] / df["Close"].iloc[0]
        ax.plot(df.index, normalised, label=ticker, linewidth=1.2)
    ax.set_title("Normalised Close Prices (Base = 100)", fontsize=14)
    ax.set_ylabel("Normalised Price")
    ax.legend(loc="upper left")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

    # Daily returns
    ax = axes[1]
    for ticker, df in price_data.items():
        returns = df["Close"].pct_change()
        ax.plot(df.index, returns, label=ticker, alpha=0.5, linewidth=0.5)
    ax.set_title("Daily Returns", fontsize=14)
    ax.set_ylabel("Return")
    ax.axhline(y=0, color="black", linewidth=0.5)
    ax.legend(loc="upper left")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

    plt.tight_layout()
    plt.savefig(EDA_DIR / "01_price_overview.png", bbox_inches="tight")
    plt.close()
    print("Saved: 01_price_overview.png")


def plot_return_distributions(price_data: dict):
    """Histogram + QQ plot of return distributions."""
    fig, axes = plt.subplots(len(price_data), 2, figsize=(14, 4 * len(price_data)))

    for i, (ticker, df) in enumerate(price_data.items()):
        returns = df["Close"].pct_change().dropna()

        # Histogram
        ax = axes[i, 0]
        ax.hist(returns, bins=100, density=True, alpha=0.7, color="steelblue", edgecolor="white")
        # Overlay normal distribution
        x = np.linspace(returns.min(), returns.max(), 200)
        ax.plot(x, stats.norm.pdf(x, returns.mean(), returns.std()),
                "r--", linewidth=1.5, label="Normal")
        ax.set_title(f"{ticker} — Return Distribution")
        ax.set_xlabel("Daily Return")
        ax.legend()

        # Summary stats
        skew = returns.skew()
        kurt = returns.kurtosis()
        ax.text(0.98, 0.95, f"Skew: {skew:.3f}\nKurt: {kurt:.3f}",
                transform=ax.transAxes, ha="right", va="top",
                fontsize=9, bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.5))

        # QQ plot
        ax = axes[i, 1]
        stats.probplot(returns, dist="norm", plot=ax)
        ax.set_title(f"{ticker} — QQ Plot")

    plt.tight_layout()
    plt.savefig(EDA_DIR / "02_return_distributions.png", bbox_inches="tight")
    plt.close()
    print("Saved: 02_return_distributions.png")


# ═══════════════════════════════════════════════════════════════════
# SECTION 2: Technical Indicators
# ═══════════════════════════════════════════════════════════════════

def plot_technical_indicators(price_data: dict, ticker: str = "AAPL"):
    """Plot key technical indicators for a single ticker."""
    from features.technical import compute_technical_features

    df = compute_technical_features(price_data[ticker])

    fig, axes = plt.subplots(5, 1, figsize=(14, 20), sharex=True)

    # Price with MAs
    ax = axes[0]
    ax.plot(df.index, df["Close"], label="Close", color="black", linewidth=1)
    ax.plot(df.index, df["SMA_20"], label="SMA(20)", color="blue", linewidth=0.8)
    ax.plot(df.index, df["EMA_50"], label="EMA(50)", color="red", linewidth=0.8)
    ax.fill_between(df.index, df["BB_Lower"], df["BB_Upper"],
                    alpha=0.1, color="blue", label="Bollinger Bands")
    ax.set_title(f"{ticker} — Price with Moving Averages & Bollinger Bands", fontsize=13)
    ax.legend(loc="upper left", fontsize=9)

    # RSI
    ax = axes[1]
    ax.plot(df.index, df["RSI_14"], color="purple", linewidth=0.8)
    ax.axhline(70, color="red", linestyle="--", linewidth=0.5)
    ax.axhline(30, color="green", linestyle="--", linewidth=0.5)
    ax.fill_between(df.index, 30, 70, alpha=0.05, color="gray")
    ax.set_title("RSI (14)", fontsize=13)
    ax.set_ylim(0, 100)

    # MACD
    ax = axes[2]
    ax.plot(df.index, df["MACD"], label="MACD", color="blue", linewidth=0.8)
    ax.plot(df.index, df["MACD_Signal"], label="Signal", color="red", linewidth=0.8)
    colors = ["green" if v >= 0 else "red" for v in df["MACD_Hist"]]
    ax.bar(df.index, df["MACD_Hist"], color=colors, alpha=0.4, width=1)
    ax.set_title("MACD", fontsize=13)
    ax.legend(fontsize=9)

    # Volume
    ax = axes[3]
    ax.bar(df.index, df["Volume"], color="steelblue", alpha=0.5, width=1)
    vol_sma = df["Volume"].rolling(20).mean()
    ax.plot(df.index, vol_sma, color="red", linewidth=0.8, label="Volume SMA(20)")
    ax.set_title("Volume", fontsize=13)
    ax.legend(fontsize=9)

    # ATR
    ax = axes[4]
    ax.plot(df.index, df["ATR_Pct"] * 100, color="orange", linewidth=0.8)
    ax.set_title("Normalised ATR (%)", fontsize=13)
    ax.set_ylabel("%")

    plt.tight_layout()
    plt.savefig(EDA_DIR / f"03_technical_{ticker}.png", bbox_inches="tight")
    plt.close()
    print(f"Saved: 03_technical_{ticker}.png")


# ═══════════════════════════════════════════════════════════════════
# SECTION 3: Correlation Analysis
# ═══════════════════════════════════════════════════════════════════

def plot_correlation_matrix(feature_data: dict, ticker: str = "AAPL"):
    """Plot correlation heatmap of features for a ticker's training set."""
    if ticker not in feature_data:
        print(f"No feature data for {ticker}")
        return

    train = feature_data[ticker]["train"]

    # Select numeric feature columns (exclude targets and OHLCV)
    exclude = {"Open", "High", "Low", "Close", "Volume", "Ticker",
               "Target_Direction", "Target_LogReturn"}
    feature_cols = [c for c in train.columns if c not in exclude]

    # Compute correlation
    corr = train[feature_cols].corr()

    # Plot
    fig, ax = plt.subplots(figsize=(20, 18))
    mask = np.triu(np.ones_like(corr, dtype=bool))
    cmap = sns.diverging_palette(250, 10, as_cmap=True)

    sns.heatmap(
        corr, mask=mask, cmap=cmap, center=0, vmin=-1, vmax=1,
        square=True, linewidths=0.5,
        cbar_kws={"shrink": 0.6, "label": "Correlation"},
        ax=ax,
        xticklabels=True, yticklabels=True,
    )
    ax.set_title(f"{ticker} — Feature Correlation Matrix (Training Set)", fontsize=14)
    plt.xticks(fontsize=7, rotation=90)
    plt.yticks(fontsize=7)
    plt.tight_layout()
    plt.savefig(EDA_DIR / f"04_correlation_{ticker}.png", bbox_inches="tight")
    plt.close()
    print(f"Saved: 04_correlation_{ticker}.png")


def plot_top_target_correlations(feature_data: dict, ticker: str = "AAPL", top_n: int = 20):
    """Bar chart of features most correlated with target."""
    if ticker not in feature_data:
        return

    train = feature_data[ticker]["train"]
    exclude = {"Open", "High", "Low", "Close", "Volume", "Ticker",
               "Target_Direction", "Target_LogReturn"}
    feature_cols = [c for c in train.columns if c not in exclude]

    # Correlation with target
    target_corr = train[feature_cols].corrwith(train["Target_LogReturn"]).dropna()
    top = target_corr.abs().nlargest(top_n)
    top_values = target_corr.loc[top.index]

    fig, ax = plt.subplots(figsize=(12, 8))
    colors = ["green" if v > 0 else "red" for v in top_values]
    ax.barh(range(len(top_values)), top_values.values, color=colors, alpha=0.7)
    ax.set_yticks(range(len(top_values)))
    ax.set_yticklabels(top_values.index)
    ax.set_xlabel("Correlation with Target (Next-Day Log Return)")
    ax.set_title(f"{ticker} — Top {top_n} Feature-Target Correlations", fontsize=14)
    ax.axvline(0, color="black", linewidth=0.5)
    ax.invert_yaxis()
    plt.tight_layout()
    plt.savefig(EDA_DIR / f"05_target_corr_{ticker}.png", bbox_inches="tight")
    plt.close()
    print(f"Saved: 05_target_corr_{ticker}.png")


# ═══════════════════════════════════════════════════════════════════
# SECTION 4: Target Analysis
# ═══════════════════════════════════════════════════════════════════

def plot_target_analysis(feature_data: dict):
    """Analyse target distribution and class balance across tickers and splits."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))

    # Class balance per ticker (training set)
    ax = axes[0]
    tickers = []
    up_pcts = []
    for ticker in PRIMARY_TICKERS:
        if ticker in feature_data:
            train = feature_data[ticker]["train"]
            tickers.append(ticker)
            up_pcts.append(train["Target_Direction"].mean() * 100)

    ax.bar(tickers, up_pcts, color="steelblue", alpha=0.7)
    ax.axhline(50, color="red", linestyle="--", linewidth=1, label="50% baseline")
    ax.set_ylabel("% Up Days")
    ax.set_title("Class Balance: % Up Days (Training Set)", fontsize=13)
    ax.set_ylim(40, 60)
    ax.legend()

    # Target return distribution per split (AAPL)
    ax = axes[1]
    if "AAPL" in feature_data:
        for split, color in [("train", "blue"), ("val", "orange"), ("test", "green")]:
            if split in feature_data["AAPL"]:
                returns = feature_data["AAPL"][split]["Target_LogReturn"]
                ax.hist(returns, bins=80, density=True, alpha=0.4,
                       color=color, label=f"{split} (n={len(returns)})")
    ax.set_title("AAPL — Target Log Return Distribution by Split", fontsize=13)
    ax.set_xlabel("Next-Day Log Return")
    ax.legend()

    plt.tight_layout()
    plt.savefig(EDA_DIR / "06_target_analysis.png", bbox_inches="tight")
    plt.close()
    print("Saved: 06_target_analysis.png")


# ═══════════════════════════════════════════════════════════════════
# SECTION 5: Train/Val/Test Split Visualisation
# ═══════════════════════════════════════════════════════════════════

def plot_split_timeline(feature_data: dict, ticker: str = "AAPL"):
    """Visualise the chronological train/val/test split."""
    if ticker not in feature_data:
        return

    fig, ax = plt.subplots(figsize=(14, 5))

    splits = feature_data[ticker]
    colors = {"train": "#2196F3", "val": "#FF9800", "test": "#4CAF50"}
    labels = {"train": "Train", "val": "Validation", "test": "Test"}

    for split_name, color in colors.items():
        if split_name in splits:
            df = splits[split_name]
            # Reconstruct approximate close from scaled data + plot as filled region
            ax.axvspan(df.index.min(), df.index.max(),
                      alpha=0.2, color=color, label=f"{labels[split_name]} ({len(df)} days)")
            ax.axvline(df.index.min(), color=color, linewidth=1, linestyle="--")

    # Load raw price for overlay
    try:
        raw = load_price_data(ticker)
        ax.plot(raw.index, raw["Close"], color="black", linewidth=0.8, label="Close Price")
    except FileNotFoundError:
        pass

    ax.set_title(f"{ticker} — Chronological Train/Val/Test Split", fontsize=14)
    ax.set_ylabel("Close Price")
    ax.legend(loc="upper left")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))

    plt.tight_layout()
    plt.savefig(EDA_DIR / f"07_split_timeline_{ticker}.png", bbox_inches="tight")
    plt.close()
    print(f"Saved: 07_split_timeline_{ticker}.png")


# ═══════════════════════════════════════════════════════════════════
# SECTION 6: Summary Statistics Table
# ═══════════════════════════════════════════════════════════════════

def generate_summary_table(price_data: dict) -> pd.DataFrame:
    """Generate a summary statistics table for all tickers."""
    records = []
    for ticker, df in price_data.items():
        returns = df["Close"].pct_change().dropna()
        records.append({
            "Ticker": ticker,
            "Start": df.index.min().date(),
            "End": df.index.max().date(),
            "Trading Days": len(df),
            "Mean Return (%)": f"{returns.mean() * 100:.4f}",
            "Std Dev (%)": f"{returns.std() * 100:.4f}",
            "Skewness": f"{returns.skew():.4f}",
            "Kurtosis": f"{returns.kurtosis():.4f}",
            "Min Return (%)": f"{returns.min() * 100:.2f}",
            "Max Return (%)": f"{returns.max() * 100:.2f}",
            "% Positive Days": f"{(returns > 0).mean() * 100:.1f}",
        })

    summary = pd.DataFrame(records)
    summary.to_csv(EDA_DIR / "00_summary_statistics.csv", index=False)
    print("Saved: 00_summary_statistics.csv")
    return summary


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def run_full_eda():
    """Execute all EDA analyses and save outputs."""
    print("=" * 60)
    print("EXPLORATORY DATA ANALYSIS")
    print("=" * 60)

    # Load data
    print("\nLoading price data...")
    price_data = load_all_prices()

    print("Loading feature data...")
    feature_data = load_all_features()

    if not price_data:
        print("ERROR: No price data found. Run data ingestion first.")
        return

    # Run all analyses
    print("\n--- Summary Statistics ---")
    summary = generate_summary_table(price_data)
    print(summary.to_string(index=False))

    print("\n--- Price Overview ---")
    plot_price_overview(price_data)

    print("\n--- Return Distributions ---")
    plot_return_distributions(price_data)

    print("\n--- Technical Indicators ---")
    for ticker in list(price_data.keys())[:2]:  # First 2 tickers
        plot_technical_indicators(price_data, ticker)

    if feature_data:
        print("\n--- Correlation Analysis ---")
        plot_correlation_matrix(feature_data, "AAPL")

        print("\n--- Target Correlations ---")
        plot_top_target_correlations(feature_data, "AAPL")

        print("\n--- Target Analysis ---")
        plot_target_analysis(feature_data)

        print("\n--- Split Timeline ---")
        for ticker in list(feature_data.keys())[:2]:
            plot_split_timeline(feature_data, ticker)

    print("\n" + "=" * 60)
    print(f"EDA complete! All outputs saved to: {EDA_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    run_full_eda()
