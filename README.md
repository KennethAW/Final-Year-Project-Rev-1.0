# Machine Learning and Quantitative Trading in Stock Market

**NTU EEE Final Year Project A1088-251**

**Student:** Kenneth Anthony Wijaya
**Supervisor:** A/P Wong Jia Yiing, Patricia

Can machine learning models predict next-day stock price movements accurately enough to
generate risk-adjusted profits that beat a passive buy-and-hold benchmark, after realistic
transaction costs?

This project builds the full stack needed to answer that honestly: a 72-feature multi-modal
data pipeline, four competing model architectures, and a vectorised backtesting engine that
charges realistic friction before reporting a single number.

---

## Headline Results

Test window: 355 trading days (2023–2024), 20 model-ticker combinations, 5 bps per side.

| | Best Strategy (TFT on GOOGL) | Benchmark (SPY buy & hold) |
|---|---|---|
| Total return | **25.1%** | 34.4% |
| Annualised return | **17.2%** | 23.4% |
| Sharpe ratio | **1.01** | 1.44 |
| Max drawdown | −12.6% | — |
| Win rate | 51.4% | — |
| Profit factor | 1.42 | — |

**Four findings:**

1. **Simpler models win.** XGBoost led on mean directional accuracy at **55.5%**, beating
   transformer architectures carrying up to 60x more parameters. On low signal-to-noise daily
   data, inductive bias beats raw capacity.
2. **Predictive signal is asset-specific.** Feature importance splits differently per ticker,
   so a single universal feature set underperforms per-ticker tuning.
3. **Daily news sentiment added nothing.** FinBERT sentiment and calendar features received
   **0% importance** from XGBoost across all five tickers — by the daily close, the news is
   already priced in.
4. **Regression beats classification.** Predicting the continuous log return produced a sharper
   trading signal than predicting direction as a binary label.

**On the benchmark:** no strategy beat SPY over this window. SPY returned 34.4% cumulative
(23.4% annualised) during the 2023–24 rally, far above its long-run ~10% average, making
buy-and-hold an exceptionally high bar. A cost-sensitivity ablation confirms the result holds
even at 0 bps, so this is a structural finding rather than a transaction-cost artefact.

---

## Where to Start

| If you want to see… | Open |
|---|---|
| The full story in slides | `FYP-Presentation.pdf` (18 slides) |
| The analytics dashboard | `FYP-Dashboard.pdf`, or run `dashboard-react/` live |
| The written report | `presentation/public/FYP-Report.docx` |
| How models were built | `models/` and `features/` |
| How results were measured | `backtest/engine.py` and `evaluation/metrics.py` |
| Step-by-step reproduction | `EXECUTION_GUIDE.md` |

---

## Quick Start

### Python pipeline

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Data pipeline (downloads data + engineers the feature set)
python scripts/run_pipeline.py --live

# 3. Train models (independent — any order)
python scripts/train_xgboost.py
python scripts/train_lstm.py
python scripts/train_tft.py
python scripts/train_patchtst.py

# 4. Compare models and run backtests
python scripts/compare_models.py
python scripts/run_backtest.py
```

### React apps

Both are Vite apps and need Node.js 18+. They ship with pre-exported JSON, so they run
without retraining anything.

```bash
# Interactive analytics dashboard  → http://localhost:5174
cd dashboard-react && npm install && npm run dev

# Presentation deck (18 slides)    → http://localhost:5173
cd presentation && npm install && npm run dev
```

The live ticker bar in both apps is optional. It reads a free
[Finnhub](https://finnhub.io/register) key from `.env` — copy `.env.example` to `.env` and paste
a key in. Without one, everything else still works.

### Legacy Streamlit dashboard

```bash
streamlit run dashboard/app.py
```

---

## Project Structure

```
Final Year Project Rev 1.0/
├── configs/config.py          # Central configuration (paths, hyperparameters, seeds)
├── data/
│   ├── ingestion.py           # Yahoo Finance data download + caching (Parquet)
│   ├── synthetic.py           # Synthetic data generator for testing
│   ├── raw/                   # Raw OHLCV + macro + sector Parquet files
│   ├── processed/             # Intermediate cleaned data
│   └── features/              # Train/val/test splits per ticker
├── features/
│   ├── technical.py           # 27 technical indicators (pure pandas, no ta-lib)
│   ├── sentiment.py           # 9 FinBERT sentiment features (ProsusAI/finbert)
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
├── dashboard-react/           # React + Vite analytics dashboard (primary)
│   ├── src/                   # Charts, model comparison, signal explorer
│   └── public/data/           # Pre-exported JSON — runs without retraining
├── presentation/              # React + Vite presentation deck (18 slides)
│   ├── src/components/slides/ # One component per slide
│   └── public/FYP-Report.docx # Written thesis report
├── dashboard/app.py           # Legacy Streamlit dashboard (4 pages)
├── scripts/                   # CLI entry points
│   ├── run_pipeline.py        # Full data pipeline
│   ├── train_*.py             # Per-model training entry points
│   ├── run_backtest.py        # Run backtesting engine
│   ├── compare_models.py      # Cross-model comparison & ranking
│   ├── export_dashboard_data.py  # Results → dashboard JSON
│   └── generate_pdfs.mjs      # Puppeteer slide/dashboard PDF capture
├── notebooks/01_EDA.py        # Exploratory data analysis
├── EXECUTION_GUIDE.md         # Detailed step-by-step execution guide
├── FYP-Presentation.pdf       # Exported 18-slide deck
└── FYP-Dashboard.pdf          # Exported dashboard walkthrough
```

Trained model weights (`models/saved/`), raw Parquet data, and generated result files are
gitignored — they are large and fully reproducible from the scripts above.

---

## Models

| Model | Type | Architecture | Params | Key Feature |
|-------|------|-------------|--------|-------------|
| XGBoost | Tree ensemble | Optuna TPE (100 trials) | — | Feature importance, handles NaN natively |
| LSTM | RNN | 2-layer, hidden=128, dropout=0.3 | ~233K | AdamW, ReduceLROnPlateau, 3-layer NaN defence |
| TFT | Transformer | pytorch-forecasting 1.6.1 | ~965K | Variable selection networks, temporal attention |
| PatchTST | Transformer | Custom PyTorch, patch_len=4, stride=2 | ~580K | Patch embedding, CosineAnnealingWarmRestarts |

Deep-learning parameter counts come from literature-recommended configurations rather than
architecture-intrinsic limits.

## Data

- **Universe:** AAPL, MSFT, GOOGL, JPM, XOM (tech, finance, energy sectors)
- **Period:** 2015-01-01 to 2024-12-31
- **Split:** 70% train / 15% validation / 15% test (chronological, no leakage)
- **Features (72 across 4 modalities):** 27 technical indicators + 32 macro + 9 FinBERT
  sentiment + 4 calendar

## Dual Prediction Targets

- **Target_Direction** — Binary classification (1 = up, 0 = down)
- **Target_LogReturn** — Regression (next-day log return)

## Backtesting

- Vectorised engine, executed at the next-day close
- Entry gate: classification confidence ≥ 0.55
- Position sizing: driven by |predicted log return|, normalised to the 95th percentile of
  training-set predictions, capped at 100% of capital
- Risk management: −3% stop-loss, +5% take-profit
- Transaction costs: 5 basis points per side (entry and exit)
- Long-only, no leverage, no short selling
- Benchmark: SPY buy-and-hold

## Environment

- Python 3.11, Windows 11, NVIDIA RTX 4070 Laptop GPU (CUDA)
- Node.js 18+ for the React apps
- Key packages: torch>=2.1, pytorch-forecasting==1.6.1, lightning>=2.1, xgboost>=2.0,
  transformers>=4.36
- Global seed fixed at 42 for reproducibility

## Status

All four models trained and verified. Backtesting, cross-model comparison, dashboard, and
presentation complete.
