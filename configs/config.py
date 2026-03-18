"""
Central configuration for the FYP project.
All magic numbers, paths, and hyperparameters live here.
"""

from pathlib import Path
from datetime import date

# ─── Project Paths ───────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
FEATURES_DIR = DATA_DIR / "features"
MODELS_DIR = PROJECT_ROOT / "models" / "saved"
RESULTS_DIR = PROJECT_ROOT / "evaluation" / "results"
NOTEBOOKS_DIR = PROJECT_ROOT / "notebooks"

# Create directories if they don't exist
for d in [RAW_DIR, PROCESSED_DIR, FEATURES_DIR, MODELS_DIR, RESULTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── Data Configuration ──────────────────────────────────────────
# Primary development tickers (diverse sectors)
PRIMARY_TICKERS = ["AAPL", "MSFT", "GOOGL", "JPM", "XOM"]

# Macro / market regime tickers
MACRO_TICKERS = {
    "VIX": "^VIX",          # CBOE Volatility Index
    "TNX": "^TNX",          # US 10-Year Treasury Yield
    "SPX": "^GSPC",         # S&P 500 Index
}

# Sector ETFs for relative returns
SECTOR_ETFS = {
    "XLK": "XLK",   # Technology
    "XLF": "XLF",   # Financials
    "XLE": "XLE",   # Energy
    "XLV": "XLV",   # Healthcare
    "XLI": "XLI",   # Industrials
}

# Data period
START_DATE = "2015-01-01"
END_DATE = "2024-12-31"

# Train / Validation / Test split ratios (chronological)
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15

# ─── Feature Engineering ─────────────────────────────────────────
# Technical indicator parameters
SMA_PERIOD = 20
EMA_PERIOD = 50
RSI_PERIOD = 14
ATR_PERIOD = 14
BB_PERIOD = 20
BB_STD = 2.0
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9
STOCH_K = 14
STOCH_D = 3
ROC_PERIOD = 10
ADX_PERIOD = 14
VOLUME_SMA_PERIOD = 20

# Sentiment parameters
SENTIMENT_ROLLING_WINDOWS = [3, 7]  # Rolling sentiment windows (days)
FINBERT_MODEL = "ProsusAI/finbert"

# ─── Model Configuration ─────────────────────────────────────────
LOOKBACK_WINDOW = 20      # Trading days lookback for sequence models
FORECAST_HORIZON = 1      # Next-day prediction
RANDOM_SEED = 42

# LSTM / GRU
LSTM_HIDDEN_SIZE = 128
LSTM_NUM_LAYERS = 2
LSTM_DROPOUT = 0.3
LSTM_LR = 1e-3
LSTM_EPOCHS = 100
LSTM_PATIENCE = 10        # Early stopping patience

# XGBoost
XGBOOST_N_TRIALS = 100   # Optuna trials

# ─── Backtesting ──────────────────────────────────────────────────
TRANSACTION_COST_BPS = 5          # 5 basis points per trade
RISK_FREE_RATE_TICKER = "^IRX"    # 3-month T-bill for Sharpe calculation
CONFIDENCE_THRESHOLD = 0.55       # Minimum model confidence for entry
TOP_N_STOCKS = 5                  # Trade top-N by predicted confidence
BENCHMARK_TICKER = "SPY"

# ─── Reproducibility ─────────────────────────────────────────────
def set_seeds(seed: int = RANDOM_SEED):
    """Set all random seeds for reproducibility."""
    import random
    import numpy as np
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch
        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False
    except ImportError:
        pass
