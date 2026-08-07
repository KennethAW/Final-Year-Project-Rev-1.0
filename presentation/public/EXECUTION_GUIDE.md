# FYP A1088-251: Execution Guide

## Machine Learning and Quantitative Trading in Stock Market

This guide walks you through running the entire project from scratch, in the correct order, with what to expect at each step.

---

## Prerequisites

### 1. Python Environment

```bash
python --version   # Requires 3.10+
```

### 2. Install Dependencies

```bash
cd "Final Year Project Rev 1.0"
pip install -r requirements.txt
```

**Note on PyTorch:** The `torch`, `pytorch-forecasting`, and `pytorch-lightning` packages are large. If you have a CUDA GPU, install the GPU version of PyTorch first:

```bash
# CPU only
pip install torch torchvision

# CUDA 11.8 (check your GPU)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### 3. Verify Critical Imports

```bash
python -c "import xgboost; import torch; import pytorch_forecasting; import lightning.pytorch; import streamlit; print('All imports OK')"
```

If `pytorch_forecasting` fails, install it separately: `pip install pytorch-forecasting`

---

## Step-by-Step Execution

### Step 1: Data Pipeline

**What it does:** Downloads 10 years of OHLCV data for 5 tickers (AAPL, MSFT, GOOGL, JPM, XOM), macro indicators (VIX, Treasury yields, S&P 500), sector ETFs, and the SPY benchmark. Then engineers 76 columns (68 features + OHLCV + Date + targets) per ticker, creates targets, splits chronologically (70/15/15), and scales features.

#### Option A: Live Data (requires internet + yfinance access)

```bash
python scripts/run_pipeline.py --live
```

#### Option B: Synthetic Data (for offline development / testing)

```bash
python scripts/run_pipeline.py --synthetic
```

#### Option C: Live Data + FinBERT Sentiment (requires GPU, ~30 min)

```bash
python scripts/run_pipeline.py --live --sentiment
```

**What to look for:**

- Console logs showing download progress for each ticker
- `data/raw/` folder populates with Parquet files (one per ticker + macro + sector + benchmark)
- `data/features/` folder populates with `{TICKER}_features.parquet` files (5 files)
- Each features file should have 76 columns total (68 features + OHLCV + targets)
- The split summary printed to console: train/val/test row counts per ticker
- No NaN warnings after the warmup period is dropped (~50 rows)

**Expected output files:**

```
data/raw/price_AAPL.parquet  (and price_MSFT, price_GOOGL, price_JPM, price_XOM)
data/raw/macro_VIX.parquet, macro_TNX.parquet, macro_SPX.parquet
data/raw/sector_XLK.parquet, sector_XLF.parquet, sector_XLE.parquet, sector_XLV.parquet, sector_XLI.parquet
data/raw/benchmark_SPY.parquet
data/features/{TICKER}_train.parquet, {TICKER}_val.parquet, {TICKER}_test.parquet  (5 tickers × 3 splits = 15 files)
```

**Typical runtime:** ~2 min (live), ~10 sec (synthetic)

---

### Step 2: Train XGBoost (Baseline)

**What it does:** Trains XGBoost classifier (direction prediction) and regressor (return prediction) for each ticker. Uses Optuna TPE sampler for hyperparameter optimization.

```bash
# Full run (100 Optuna trials per ticker — ~30 min)
python scripts/train_xgboost.py --trials 100

# Quick test (10 trials — ~3 min)
python scripts/train_xgboost.py --trials 10

# Single ticker only
python scripts/train_xgboost.py --ticker AAPL --trials 50
```

**What to look for:**

- Optuna trial progress bars (one per ticker, classification + regression)
- Best trial parameters printed after optimization
- Per-ticker metrics summary: accuracy, F1, RMSE, directional accuracy
- Feature importance rankings (top 20 features per ticker)

**Expected output files:**

```
models/saved/xgboost/{TICKER}/clf_model.json, clf_params.json
models/saved/xgboost/{TICKER}/reg_model.json, reg_params.json
evaluation/results/xgboost/{TICKER}_predictions.parquet
evaluation/results/xgboost/{TICKER}_metrics.json
evaluation/results/xgboost/{TICKER}_feature_importance.csv
evaluation/results/xgboost/{TICKER}_confusion_matrix.png
evaluation/results/xgboost/{TICKER}_roc_curve.png
evaluation/results/xgboost/{TICKER}_pred_vs_actual.png
evaluation/results/xgboost/{TICKER}_feature_importance.png
evaluation/results/xgboost/summary.csv
```

**What good results look like:**

- Test accuracy: 50-55% (on real data; near 50% on synthetic is expected)
- Directional accuracy: 50-55%
- Feature importance: expect technical indicators (RSI, MACD) and momentum features (Return_5d, Return_20d) near the top

---

### Step 3: Train LSTM

**What it does:** Trains 2-layer LSTM networks with lookback=20 for both classification and regression. Uses AdamW optimizer, learning rate scheduling, early stopping, and gradient clipping.

```bash
# All tickers (default 100 epochs, early stopping at patience=10)
python scripts/train_lstm.py

# Custom settings
python scripts/train_lstm.py --epochs 50 --batch-size 32 --patience 15

# Single ticker
python scripts/train_lstm.py --ticker AAPL --epochs 100
```

**What to look for:**

- Training/validation loss printed each epoch
- Early stopping trigger (should fire well before max epochs)
- Learning rate reductions logged by the scheduler
- Training history plots (loss curves should show convergence)

**Expected output files:**

```
models/saved/lstm/{TICKER}/clf_model.pt
models/saved/lstm/{TICKER}/reg_model.pt
evaluation/results/lstm/{TICKER}_predictions.parquet
evaluation/results/lstm/{TICKER}_metrics.json
evaluation/results/lstm/{TICKER}_clf_history.csv, {TICKER}_clf_history.png
evaluation/results/lstm/{TICKER}_reg_history.csv, {TICKER}_reg_history.png
evaluation/results/lstm/{TICKER}_confusion_matrix.png
evaluation/results/lstm/{TICKER}_roc_curve.png
evaluation/results/lstm/{TICKER}_pred_vs_actual.png
evaluation/results/lstm/summary.csv
```

**What good results look like:**

- Validation loss should decrease then plateau (not diverge)
- Early stopping around epoch 20-40 typically
- Test accuracy similar to or slightly better than XGBoost
- If loss diverges: reduce learning rate or increase dropout

---

### Step 4: Train TFT (Primary Model)

**What it does:** Trains the Temporal Fusion Transformer — the project's primary model contribution. Leverages variable selection networks, temporal attention, and multi-horizon forecasting via pytorch-forecasting.

```bash
# Default settings
python scripts/train_tft.py

# Custom architecture
python scripts/train_tft.py --hidden-size 128 --attention-heads 4 --epochs 50

# Single ticker
python scripts/train_tft.py --ticker AAPL
```

**What to look for:**

- PyTorch Lightning training progress bars
- Validation loss at each epoch
- Early stopping trigger (patience=8)
- Variable importance plots — **this is key for your thesis**: which features does TFT select as most important?
- Attention weight heatmaps — which past timesteps contribute most to predictions?

**Expected output files:**

```
models/saved/tft/{TICKER}/tft_model.pt
evaluation/results/tft/{TICKER}_predictions.parquet
evaluation/results/tft/{TICKER}_metrics.json
evaluation/results/tft/{TICKER}_encoder_importance.csv, {TICKER}_encoder_importance.png
evaluation/results/tft/{TICKER}_decoder_importance.csv, {TICKER}_decoder_importance.png
evaluation/results/tft/{TICKER}_attention.png
evaluation/results/tft/{TICKER}_attention_weights.npy
evaluation/results/tft/{TICKER}_confusion_matrix.png
evaluation/results/tft/{TICKER}_pred_vs_actual.png
evaluation/results/tft/summary.csv
```

**What good results look like:**

- Validation loss should steadily decrease
- Variable importance: expect VIX, momentum features, and volume indicators near the top
- Attention weights: recent timesteps (t-1 to t-5) should have higher weights than distant ones
- This model should ideally match or exceed XGBoost/LSTM on directional accuracy

**Troubleshooting:**

- If OOM (out of memory): reduce `--batch-size` to 32 or `--hidden-size` to 32
- If very slow: ensure PyTorch detects your GPU (`python -c "import torch; print(torch.cuda.is_available())"`)

---

### Step 5: Train PatchTST

**What it does:** Trains a custom PatchTST (Patch Time Series Transformer) implementation. Segments the input sequence into patches, embeds them, and processes with a pre-norm Transformer encoder. Uses CosineAnnealingWarmRestarts scheduler.

```bash
# Default settings (patch_len=4, stride=2, d_model=128, 3 layers, 4 heads)
python scripts/train_patchtst.py

# Custom patch configuration
python scripts/train_patchtst.py --patch-len 8 --stride 4 --d-model 256 --n-layers 4

# Single ticker
python scripts/train_patchtst.py --ticker AAPL
```

**What to look for:**

- Model parameter count printed at start (~200K parameters)
- Training/validation loss per epoch
- Learning rate schedule (cosine annealing with warm restarts)
- Attention weight extraction for interpretability

**Expected output files:**

```
models/saved/patchtst/{TICKER}/clf_model.pt
models/saved/patchtst/{TICKER}/reg_model.pt
evaluation/results/patchtst/{TICKER}_predictions.parquet
evaluation/results/patchtst/{TICKER}_metrics.json
evaluation/results/patchtst/{TICKER}_clf_history.csv, {TICKER}_clf_history.png
evaluation/results/patchtst/{TICKER}_reg_history.csv, {TICKER}_reg_history.png
evaluation/results/patchtst/{TICKER}_confusion_matrix.png
evaluation/results/patchtst/{TICKER}_pred_vs_actual.png
evaluation/results/patchtst/{TICKER}_attention_layer{0,1,2}.npy
evaluation/results/patchtst/summary.csv
```

**What good results look like:**

- Should converge faster than LSTM due to parallel processing
- Comparable or better directional accuracy than LSTM
- Attention weights should show patch-level temporal importance

---

### Step 6: Run Backtests

**What it does:** Runs vectorised backtesting on each model's predictions. Generates trading signals (based on confidence threshold), sizes positions proportionally to predicted return magnitude, applies stop-loss (3%) / take-profit (5%), and charges 5bps transaction costs. Produces tearsheet visualisations.

```bash
# Backtest all models, all tickers (default threshold=0.55)
python scripts/run_backtest.py

# Specific model and ticker
python scripts/run_backtest.py --model xgboost --ticker AAPL

# Adjust confidence threshold
python scripts/run_backtest.py --threshold 0.60

# Skip tearsheet generation (faster)
python scripts/run_backtest.py --no-tearsheet
```

**What to look for:**

- Per-ticker financial metrics printed to console
- Tearsheet PNGs with multi-panel analysis (equity curve, annual returns, trade markers)
- Comparison against buy-and-hold benchmark (SPY)

**Expected output files:**

```
evaluation/results/backtest/{model}/{TICKER}_metrics.json
evaluation/results/backtest/{model}/{TICKER}_trades.csv
evaluation/results/backtest/{model}/{TICKER}_{model}_tearsheet.png
evaluation/results/backtest/{model}/{TICKER}_{model}_equity_curve.png
evaluation/results/backtest/{model}/{TICKER}_{model}_annual_returns.png
evaluation/results/backtest/{model}/{TICKER}_{model}_trades.png
evaluation/results/backtest/backtest_summary.csv
```

**Key metrics to check (per model per ticker):**

| Metric | What it means | Good range |
|--------|--------------|------------|
| Total Return | Cumulative P&L | > 0% (positive) |
| Annualised Return | Yearly average | > buy-and-hold |
| Sharpe Ratio | Risk-adjusted return | > 1.0 |
| Sortino Ratio | Downside-risk-adjusted | > 1.5 |
| Max Drawdown | Worst peak-to-trough | < -20% |
| Calmar Ratio | Return / max drawdown | > 0.5 |
| Win Rate | % profitable trades | > 50% |
| Profit Factor | Gross profit / gross loss | > 1.0 |

**Note on synthetic data:** If you ran with synthetic data, backtest results will be noisy and near-random. This is expected — GBM synthetic data follows a random walk with no predictable patterns. Real data should show more meaningful signals.

---

### Step 7: Compare All Models

**What it does:** Aggregates metrics from all 4 models into a single comparison table. Produces bar charts for key metrics across models.

```bash
python scripts/compare_models.py
```

**What to look for:**

- A printed comparison table showing all models side by side
- Bar chart visualisations comparing accuracy, F1, RMSE, Sharpe ratio
- Model ranking by different criteria

**Expected output files:**

```
evaluation/results/comparison/model_comparison.csv
evaluation/results/comparison/compare_Clf_accuracy.png
evaluation/results/comparison/compare_Clf_f1_macro.png
evaluation/results/comparison/compare_Clf_mcc.png
evaluation/results/comparison/compare_Clf_roc_auc.png
evaluation/results/comparison/compare_Reg_rmse.png
evaluation/results/comparison/compare_Reg_mae.png
evaluation/results/comparison/compare_Reg_directional_accuracy.png
evaluation/results/comparison/compare_mean_summary.png
```

**What to present in your thesis:** The comparison table is one of your key deliverables. Look for:

- Which model has the best classification accuracy?
- Which model has the best directional accuracy (most useful for trading)?
- Which model produces the best risk-adjusted returns (Sharpe ratio)?
- Does TFT's interpretability (variable importance + attention) provide insights that simpler models miss?

---

### Step 8: Launch Dashboard

**What it does:** Starts an interactive Streamlit web application with 4 pages for exploring all results visually.

```bash
streamlit run dashboard/app.py
```

Then open `http://localhost:8501` in your browser.

**Dashboard pages:**

1. **Overview** — Cross-model comparison table + bar charts. Start here for the big picture.
2. **Backtest Results** — Select a model and ticker to see equity curves, metric cards, and the full trade log. Use this to deep-dive into individual strategy performance.
3. **Signal Explorer** — Interactive 3-panel chart: price action with buy/sell signals overlaid, model confidence bars, and predicted returns. Use the date slider to zoom into specific periods.
4. **Feature Analysis** — Feature importance bar chart and correlation heatmaps. Use this to understand what drives each model's decisions.

**What to look for:**

- All 4 models should appear in the Overview dropdown
- Equity curves should be smooth (not all-zero or flat)
- Signals should cluster around trend changes (not random scatter)
- Feature importance should highlight sensible features (RSI, MACD, VIX)

---

## Quick Reference: Complete Run (Copy-Paste)

```bash
# 1. Install
pip install -r requirements.txt

# 2. Data pipeline (use --live instead of --synthetic for real data)
python scripts/run_pipeline.py --synthetic

# 3. Train all models
python scripts/train_xgboost.py --trials 50
python scripts/train_lstm.py --epochs 100
python scripts/train_tft.py --epochs 50
python scripts/train_patchtst.py --epochs 100

# 4. Backtest all models
python scripts/run_backtest.py

# 5. Compare
python scripts/compare_models.py

# 6. Dashboard
streamlit run dashboard/app.py
```

---

## Project Structure Reference

```
Final Year Project Rev 1.0/
├── configs/config.py          # All hyperparameters and paths
├── data/
│   ├── ingestion.py           # Yahoo Finance downloader
│   ├── synthetic.py           # GBM synthetic data generator
│   ├── raw/                   # Downloaded/generated OHLCV data
│   ├── processed/             # Intermediate data
│   └── features/              # Final feature matrices (Parquet)
├── features/
│   ├── technical.py           # 27 technical indicators
│   ├── sentiment.py           # FinBERT sentiment pipeline
│   ├── macro.py               # Macro/sector features
│   └── pipeline.py            # Orchestrates all feature engineering
├── models/
│   ├── xgboost_model.py       # XGBoost + Optuna HPO
│   ├── lstm_model.py          # LSTM classifier/regressor
│   ├── tft_model.py           # Temporal Fusion Transformer
│   ├── patchtst_model.py      # PatchTST (custom implementation)
│   └── saved/                 # Trained model checkpoints
├── backtest/
│   ├── engine.py              # Vectorised backtesting engine
│   └── tearsheet.py           # Performance visualisations
├── evaluation/
│   ├── metrics.py             # Classification, regression, financial metrics
│   ├── visualisation.py       # Plotting utilities
│   └── results/               # All outputs: predictions, metrics, plots
├── dashboard/app.py           # Streamlit interactive dashboard
├── dashboard-react/           # React dashboard (Vite + TypeScript + Recharts)
│   ├── src/                   # React components, hooks, pages
│   └── public/data/           # Static JSON data (generated by export script)
├── presentation/              # FYP presentation site (Vite + React + Tailwind)
│   └── src/                   # Slide components, layout, hooks
├── scripts/                   # Runner scripts (what you execute)
│   ├── run_pipeline.py
│   ├── train_xgboost.py
│   ├── train_lstm.py
│   ├── train_tft.py
│   ├── train_patchtst.py
│   ├── run_backtest.py
│   ├── compare_models.py
│   └── export_dashboard_data.py  # Exports evaluation data to JSON for React dashboard
├── requirements.txt
└── README.md
```

---

### Step 9: Export Data for React Dashboard

**What it does:** Converts all evaluation results (Parquet, CSV, JSON) into static JSON files that the React dashboard can load directly in the browser.

```bash
python scripts/export_dashboard_data.py
```

**What to look for:**

- Console output listing each exported file
- Final count: "20 model-ticker combinations exported"

**Expected output:**

```
dashboard-react/public/data/
├── manifest.json
├── prices/{TICKER}.json             (5 files)
├── comparison/model_comparison.json
├── comparison/eda_summary.json
├── backtest/backtest_summary.json
├── xgboost/{TICKER}_*.json          (metrics, predictions, trades, backtest_metrics, feature_importance)
├── lstm/{TICKER}_*.json
├── tft/{TICKER}_*.json
└── patchtst/{TICKER}_*.json
```

**Prerequisites:** Steps 1-7 must be completed first (data must exist in `evaluation/results/`).

---

### Step 10: Launch React Dashboard

**What it does:** Starts the interactive React dashboard — a polished, light-themed Market Intelligence Terminal that displays all model results, predictions, trade logs, and cross-model comparisons.

```bash
cd dashboard-react
npm install        # First time only
npm run dev
```

Then open `http://localhost:5174` in your browser.

**Dashboard pages:**

1. **Dashboard** — Main overview: Predictive Analytics chart (actual vs ML forecast), Signal Drivers (feature importance + radar), Execution Ledger (trade history), Risk Assessment (Sharpe, drawdown, win rate).
2. **Analytics** — Cross-model comparison: grouped bar chart of Accuracy / Directional Accuracy / ROC AUC across all 4 models, plus a full Model-Ticker Breakdown table.
3. **Signal Explorer** — Price chart with buy signal markers, prediction confidence bars, and predicted log return bars.

**Interactive controls:**

- **Ticker tabs** (top bar): Switch between AAPL, MSFT, GOOGL, JPM, XOM — all panels update instantly
- **Model selector** (top-right dropdown): Switch between XGBoost, LSTM, TFT, PatchTST

**Prerequisites:** Step 9 must be completed first (JSON data must exist in `dashboard-react/public/data/`).

---

### Step 11: Launch Presentation

**What it does:** Starts the FYP presentation — a dark-themed, scroll-snap presentation site with 10 slides covering the full project.

```bash
cd presentation
npm install        # First time only
npm run dev
```

Then open `http://localhost:5173` in your browser.

**Navigation:**

- **Scroll** or **Arrow keys** (Up/Down, PageUp/PageDown) to navigate between slides
- **Side nav** (left): Click icons to jump to any slide
- **Top nav**: Section links (Intro, Methods, Data, Model, Results, Conclusion)
- **"BEGIN PRESENTATION"** button on slide 1 scrolls to slide 2
- **"Download Report"** button (top-right) downloads the FYP report

**Slides:**

| # | Slide | Content |
|---|-------|---------|
| 1 | Title | Project title, authors, CTAs |
| 2 | Challenge | Research question + 3 challenge cards |
| 3 | Architecture | Pipeline diagram + metric cards |
| 4 | Features | 2×2 feature category grid (Technical/Sentiment/Calendar/Macro) |
| 5 | Models | Model comparison table (XGBoost/LSTM/TFT/PatchTST) |
| 6 | Prediction | Classification vs Regression performance bars |
| 7 | Trading | Backtest results: SPY benchmark, top strategies |
| 8 | Findings | Four key findings + feature ablation ring chart |
| 9 | Limitations | Current limitations + future work |
| 10 | Demo | Dashboard preview + "Launch Live Dashboard" CTA |

---

## Quick Reference: Demo Day (Copy-Paste)

```bash
# Start both the presentation and dashboard simultaneously:

# Terminal 1 — Presentation (port 5173)
cd presentation && npm run dev

# Terminal 2 — React Dashboard (port 5174)
cd dashboard-react && npm run dev
```

Open in browser:
- Presentation: `http://localhost:5173`
- Dashboard: `http://localhost:5174`

---

## Troubleshooting

**"ModuleNotFoundError: No module named 'configs'"**
Run all scripts from the project root directory (`Final Year Project Rev 1.0/`), not from inside `scripts/`.

**yfinance returns 403 Forbidden**
Your network may block Yahoo Finance. Use `--synthetic` flag to generate test data instead.

**PyTorch out of memory**
Reduce batch size: `--batch-size 32` or `--batch-size 16`. For TFT, also reduce `--hidden-size 32`.

**Backtest shows flat equity curve**
Check the confidence threshold. If it's too high (e.g., 0.70), the model generates very few signals. Try `--threshold 0.50`.

**Dashboard shows "No data found"**
You need to run the training and backtest steps first. The dashboard reads from `evaluation/results/`.

**XGBoost accuracy ~50% on synthetic data**
This is expected. Synthetic data follows a random walk (GBM) with no exploitable patterns. Real market data should yield better results.
