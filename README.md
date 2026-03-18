# Machine Learning and Quantitative Trading in Stock Market

**NTU EEE Final Year Project A1088-251**

**Student:** Kenneth Anthony Wijaya
**Supervisor:** A/P Wong Jia Yiing, Patricia

## Objective

Build and compare multiple ML/DL models for next-day stock prediction (direction + magnitude), integrate FinBERT sentiment analysis and macroeconomic features, then evaluate via a vectorised backtesting engine.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Data pipeline (downloads data + engineers 76-column feature set)
python scripts/run_pipeline.py --live

# 3. Train models (independent — any order)
python scripts/train_xgboost.py
python scripts/train_lstm.py
python scripts/train_tft.py
python scripts/train_patchtst.py

# 4. Compare models
python scripts/compare_models.py

# 5. Run backtests
python scripts/run_backtest.py

# 6. Launch dashboard
streamlit run dashboard/app.py
```

## Project Structure

```
Final Year Project Rev 1.0/
├── configs/config.py          # Central configuration (paths, hyperparameters, seeds)
├── data/
│   ├── ingestion.py           # Yahoo Finance data download + caching (Parquet)
│   ├── synthetic.py           # Synthetic data generator for testing
│   ├── raw/                   # Raw OHLCV + macro + sector Parquet files
│   ├── processed/             # Intermediate cleaned data
│   └── features/              # Train/val/test splits per ticker (76 cols each)
├── features/
│   ├── technical.py           # 27 technical indicators (pure pandas, no ta-lib)
│   ├── sentiment.py           # FinBERT sentiment pipeline (ProsusAI/finbert)
│   ├── macro.py               # 32 macro features (VIX, TNX, SPX, sector ETFs)
│   └── pipeline.py            # End-to-end feature engineering orchestrator
├── models/
│   ├── xgboost_model.py       # XGBoost + Optuna TPE hyperparameter tuning
│   ├── lstm_model.py          # 2-layer LSTM with 3-layer NaN defence
│   ├── tft_model.py           # Temporal Fusion Transformer (pytorch-forecasting)
│   ├── patchtst_model.py      # PatchTST (custom PyTorch implementation)
│   └── saved/                 # Serialised model weights per ticker
├── backtest/
│   ├── engine.py              # Vectorised backtesting engine
│   └── tearsheet.py           # Performance tearsheet generation
├── evaluation/
│   ├── metrics.py             # Classification, regression, and financial metrics
│   ├── visualisation.py       # Publication-quality plotting utilities
│   └── results/               # All outputs organised by model
│       ├── xgboost/           # 36 files (metrics, predictions, plots per ticker)
│       ├── lstm/              # 46 files
│       ├── tft/               # 56 files (includes interpretability outputs)
│       ├── patchtst/          # 61 files (includes attention weights)
│       ├── comparison/        # Cross-model comparison table + 8 charts
│       └── backtest/          # Per-model backtest metrics, trades, tearsheets
├── dashboard/app.py           # Streamlit interactive dashboard (4 pages)
├── scripts/                   # CLI entry points
│   ├── run_pipeline.py        # Full data pipeline
│   ├── train_xgboost.py       # Train XGBoost only
│   ├── train_lstm.py          # Train LSTM only
│   ├── train_tft.py           # Train TFT only
│   ├── train_patchtst.py      # Train PatchTST only
│   ├── run_backtest.py        # Run backtesting engine
│   └── compare_models.py      # Cross-model comparison & ranking
├── notebooks/01_EDA.py        # Exploratory data analysis
├── requirements.txt
├── README.md
├── EXECUTION_GUIDE.md         # Detailed step-by-step execution guide
├── CLAUDE.md                  # AI assistant context file
├── FYP_Thesis_Report.docx
└── FYP_Presentation.pptx
```

## Models

| Model | Type | Architecture | Key Feature |
|-------|------|-------------|-------------|
| XGBoost | Tree ensemble | Optuna TPE (100 trials) | Feature importance, handles NaN natively |
| LSTM | RNN | 2-layer, hidden=128, dropout=0.3 | AdamW, ReduceLROnPlateau, 3-layer NaN defence |
| TFT | Transformer | pytorch-forecasting 1.6.1 | Variable selection networks, temporal attention, interpretability |
| PatchTST | Transformer | Custom PyTorch, patch_len=4, stride=2 | Patch embedding, CosineAnnealingWarmRestarts |

## Data

- **Universe:** AAPL, MSFT, GOOGL, JPM, XOM (tech, finance, energy sectors)
- **Period:** 2015-01-01 to 2024-12-31
- **Split:** 70% train / 15% validation / 15% test (chronological, no leakage)
- **Features (76 columns):** 27 technical indicators + 5 sentiment (FinBERT) + 32 macro + 4 calendar + OHLCV + targets

## Dual Prediction Targets

- **Target_Direction** — Binary classification (1 = up, 0 = down)
- **Target_LogReturn** — Regression (next-day log return)

## Backtesting

- Vectorised engine (no event-driven simulation)
- Confidence threshold: 0.55 for trade entry
- Position sizing: proportional to model confidence
- Risk management: 3% stop-loss, 5% take-profit
- Transaction costs: 5 basis points per trade
- Benchmark: SPY buy-and-hold

## Dashboard

Interactive Streamlit dashboard with 4 pages:

1. **Overview** — Cross-model comparison table with interactive metric selector
2. **Backtest Results** — Equity curves, metric cards, trade logs per model/ticker
3. **Signal Explorer** — Price charts with signal overlays, confidence bars, predicted returns
4. **Feature Analysis** — Feature importance (XGBoost) and target correlation analysis

## Environment

- Python 3.11, Windows 11, NVIDIA RTX 4070 Laptop GPU (CUDA)
- Key packages: torch>=2.1, pytorch-forecasting==1.6.1, lightning>=2.1, xgboost>=2.0, transformers>=4.36

## Training Status

All 4 models trained and verified. Backtesting complete. Model comparison complete. Dashboard functional.
