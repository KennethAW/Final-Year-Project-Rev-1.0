"""
Interactive Dashboard
======================
Streamlit-based dashboard for visualising model predictions,
backtest results, and signal generation.
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import streamlit as st

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from configs.config import PRIMARY_TICKERS, RESULTS_DIR, RAW_DIR

# ─── Page Config ─────────────────────────────────────────────────
st.set_page_config(
    page_title="FYP — ML Quantitative Trading",
    page_icon="📈",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Sidebar ─────────────────────────────────────────────────────
st.sidebar.title("ML Quant Trading")
st.sidebar.markdown("**NTU EEE FYP A1088-251**")
st.sidebar.divider()

page = st.sidebar.radio(
    "Navigation",
    ["Overview", "Backtest Results", "Signal Explorer", "Feature Analysis"],
)

MODELS = ["xgboost", "lstm", "tft", "patchtst"]
AVAILABLE_MODELS = [m for m in MODELS if (RESULTS_DIR / m).exists()]

model_select = st.sidebar.selectbox(
    "Model", AVAILABLE_MODELS if AVAILABLE_MODELS else ["xgboost"]
)
ticker_select = st.sidebar.selectbox("Ticker", PRIMARY_TICKERS)


# ─── Data Loaders (cached) ──────────────────────────────────────

@st.cache_data
def load_metrics(model: str, ticker: str) -> dict:
    path = RESULTS_DIR / model / f"{ticker}_metrics.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


@st.cache_data
def load_predictions(model: str, ticker: str) -> pd.DataFrame:
    path = RESULTS_DIR / model / f"{ticker}_predictions.parquet"
    if path.exists():
        return pd.read_parquet(path)
    return pd.DataFrame()


@st.cache_data
def load_backtest_metrics(model: str, ticker: str) -> dict:
    path = RESULTS_DIR / "backtest" / model / f"{ticker}_metrics.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


@st.cache_data
def load_trade_log(model: str, ticker: str) -> pd.DataFrame:
    path = RESULTS_DIR / "backtest" / model / f"{ticker}_trades.csv"
    if path.exists():
        return pd.read_csv(path)
    return pd.DataFrame()


@st.cache_data
def load_price_data(ticker: str) -> pd.DataFrame:
    path = RAW_DIR / f"price_{ticker}.parquet"
    if path.exists():
        return pd.read_parquet(path)
    return pd.DataFrame()


@st.cache_data
def load_feature_importance(model: str, ticker: str) -> pd.DataFrame:
    path = RESULTS_DIR / model / f"{ticker}_feature_importance.csv"
    if path.exists():
        return pd.read_csv(path)
    return pd.DataFrame()


@st.cache_data
def load_all_comparison() -> pd.DataFrame:
    path = RESULTS_DIR / "comparison" / "model_comparison.csv"
    if path.exists():
        return pd.read_csv(path)
    return pd.DataFrame()


# ═══════════════════════════════════════════════════════════════════
# PAGE 1: OVERVIEW
# ═══════════════════════════════════════════════════════════════════

def page_overview():
    st.title("Model Performance Overview")
    st.markdown("Consolidated comparison of all models across tickers and metrics.")

    # Load comparison table
    comparison = load_all_comparison()

    if comparison.empty:
        st.warning("No comparison data found. Run `python scripts/compare_models.py` first.")

        # Try to build from individual metrics
        st.subheader("Available Model Results")
        for model in MODELS:
            model_dir = RESULTS_DIR / model
            if model_dir.exists():
                files = list(model_dir.glob("*_metrics.json"))
                st.success(f"**{model.upper()}**: {len(files)} tickers")
            else:
                st.info(f"**{model.upper()}**: Not trained yet")
        return

    st.subheader("Classification Metrics (Test Set)")
    clf_cols = [c for c in comparison.columns if c.startswith("Clf_")]
    if clf_cols:
        display_df = comparison[["Model", "Ticker"] + clf_cols].copy()
        display_df.columns = [c.replace("Clf_", "") for c in display_df.columns]
        st.dataframe(display_df.style.format(
            {c: "{:.4f}" for c in display_df.columns if c not in ["Model", "Ticker"]}
        ), use_container_width=True)

    st.subheader("Regression Metrics (Test Set)")
    reg_cols = [c for c in comparison.columns if c.startswith("Reg_")]
    if reg_cols:
        display_df = comparison[["Model", "Ticker"] + reg_cols].copy()
        display_df.columns = [c.replace("Reg_", "") for c in display_df.columns]
        st.dataframe(display_df.style.format(
            {c: "{:.4f}" for c in display_df.columns if c not in ["Model", "Ticker"]}
        ), use_container_width=True)

    # Model comparison chart
    st.subheader("Model Comparison")
    means = comparison[comparison["Ticker"] == "MEAN"]
    if not means.empty and "Clf_accuracy" in comparison.columns:
        metric_choice = st.selectbox(
            "Select metric",
            [c for c in comparison.columns if c.startswith(("Clf_", "Reg_"))]
        )
        non_mean = comparison[comparison["Ticker"] != "MEAN"]
        fig = px.bar(
            non_mean, x="Ticker", y=metric_choice, color="Model",
            barmode="group", title=f"Model Comparison — {metric_choice}",
        )
        fig.update_layout(height=400)
        st.plotly_chart(fig, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════
# PAGE 2: BACKTEST RESULTS
# ═══════════════════════════════════════════════════════════════════

def page_backtest():
    st.title("Backtest Results")

    bt_metrics = load_backtest_metrics(model_select, ticker_select)
    predictions = load_predictions(model_select, ticker_select)
    trades = load_trade_log(model_select, ticker_select)

    if not bt_metrics:
        st.warning(f"No backtest results for {model_select.upper()} / {ticker_select}. "
                   f"Run `python scripts/run_backtest.py --model {model_select}`")
        return

    # Key metrics cards
    st.subheader(f"{model_select.upper()} — {ticker_select}")
    cols = st.columns(5)
    metric_cards = [
        ("Ann. Return", bt_metrics.get("annualised_return", 0), "{:.2%}"),
        ("Sharpe Ratio", bt_metrics.get("sharpe_ratio", 0), "{:.3f}"),
        ("Max Drawdown", bt_metrics.get("max_drawdown", 0), "{:.2%}"),
        ("Win Rate", bt_metrics.get("win_rate", 0), "{:.1%}"),
        ("Profit Factor", bt_metrics.get("profit_factor", 0), "{:.3f}"),
    ]
    for col, (label, value, fmt) in zip(cols, metric_cards):
        col.metric(label, fmt.format(value))

    # Equity curve
    if not predictions.empty and "strategy_return" not in predictions.columns:
        # Reconstruct from predictions
        prices = load_price_data(ticker_select)
        if not prices.empty:
            common = predictions.index.intersection(prices.index)
            if len(common) > 0:
                mkt_ret = prices.loc[common, "Close"].pct_change()
                signal = ((predictions.loc[common, "pred_direction"] == 1) &
                          (predictions.loc[common, "pred_prob_up"] >= 0.55)).astype(int)
                strat_ret = signal * mkt_ret
                cum_strat = (1 + strat_ret.fillna(0)).cumprod()
                cum_bench = (1 + mkt_ret.fillna(0)).cumprod()

                fig = go.Figure()
                fig.add_trace(go.Scatter(
                    x=common, y=cum_strat.values,
                    name="Strategy", line=dict(color="steelblue", width=2),
                ))
                fig.add_trace(go.Scatter(
                    x=common, y=cum_bench.values,
                    name="Buy & Hold", line=dict(color="gray", width=1, dash="dash"),
                ))
                fig.update_layout(
                    title="Equity Curve", yaxis_title="Growth of $1",
                    height=450, hovermode="x unified",
                )
                st.plotly_chart(fig, use_container_width=True)

    # Full metrics table
    st.subheader("Full Metrics")
    fmt_metrics = {
        "Total Return": f"{bt_metrics.get('total_return', 0):.2%}",
        "Annualised Return": f"{bt_metrics.get('annualised_return', 0):.2%}",
        "Annualised Volatility": f"{bt_metrics.get('annualised_volatility', 0):.2%}",
        "Sharpe Ratio": f"{bt_metrics.get('sharpe_ratio', 0):.4f}",
        "Sortino Ratio": f"{bt_metrics.get('sortino_ratio', 0):.4f}",
        "Max Drawdown": f"{bt_metrics.get('max_drawdown', 0):.2%}",
        "Calmar Ratio": f"{bt_metrics.get('calmar_ratio', 0):.4f}",
        "Win Rate": f"{bt_metrics.get('win_rate', 0):.2%}",
        "Profit Factor": f"{bt_metrics.get('profit_factor', 0):.4f}",
        "Market Exposure": f"{bt_metrics.get('market_exposure', 0):.2%}",
    }
    col1, col2 = st.columns(2)
    items = list(fmt_metrics.items())
    for i, (k, v) in enumerate(items):
        (col1 if i < len(items) // 2 else col2).markdown(f"**{k}:** {v}")

    # Trade log
    if not trades.empty:
        st.subheader(f"Trade Log ({len(trades)} trades)")
        st.dataframe(trades, use_container_width=True, height=300)


# ═══════════════════════════════════════════════════════════════════
# PAGE 3: SIGNAL EXPLORER
# ═══════════════════════════════════════════════════════════════════

def page_signals():
    st.title("Signal Explorer")
    st.markdown("Explore model predictions and confidence scores.")

    predictions = load_predictions(model_select, ticker_select)

    if predictions.empty:
        st.warning(f"No predictions for {model_select.upper()} / {ticker_select}")
        return

    # Show last N days
    n_days = st.slider("Days to display", 30, len(predictions), min(90, len(predictions)))
    recent = predictions.iloc[-n_days:]

    # Price + signals chart
    prices = load_price_data(ticker_select)
    if not prices.empty:
        common = recent.index.intersection(prices.index)
        if len(common) > 0:
            price_data = prices.loc[common]

            fig = make_subplots(
                rows=3, cols=1, shared_xaxes=True,
                row_heights=[0.5, 0.25, 0.25],
                subplot_titles=["Price & Signals", "Prediction Confidence", "Predicted Return"],
                vertical_spacing=0.08,
            )

            # Price
            fig.add_trace(go.Scatter(
                x=common, y=price_data["Close"].values,
                name="Close", line=dict(color="black", width=1),
            ), row=1, col=1)

            # Buy signals
            pred_aligned = recent.loc[common]
            if "pred_direction" in pred_aligned.columns and "pred_prob_up" in pred_aligned.columns:
                buy_mask = (pred_aligned["pred_direction"] == 1) & (pred_aligned["pred_prob_up"] >= 0.55)
                buy_dates = pred_aligned.index[buy_mask]
                buy_prices = price_data.loc[buy_dates, "Close"]
                fig.add_trace(go.Scatter(
                    x=buy_dates, y=buy_prices.values,
                    mode="markers", name="Long Signal",
                    marker=dict(color="green", size=8, symbol="triangle-up"),
                ), row=1, col=1)

            # Confidence
            if "pred_prob_up" in pred_aligned.columns:
                fig.add_trace(go.Bar(
                    x=common, y=pred_aligned["pred_prob_up"].values,
                    name="P(Up)", marker_color=np.where(
                        pred_aligned["pred_prob_up"].values >= 0.55, "green", "lightgray"
                    ),
                ), row=2, col=1)
                fig.add_hline(y=0.55, line_dash="dash", line_color="red",
                             annotation_text="Threshold", row=2, col=1)

            # Predicted return
            if "pred_log_return" in pred_aligned.columns:
                colors = np.where(pred_aligned["pred_log_return"].values > 0, "green", "red")
                fig.add_trace(go.Bar(
                    x=common, y=pred_aligned["pred_log_return"].values,
                    name="Pred Return", marker_color=colors,
                ), row=3, col=1)

            fig.update_layout(height=700, showlegend=True, hovermode="x unified")
            st.plotly_chart(fig, use_container_width=True)

    # Predictions table
    st.subheader("Raw Predictions")
    display_cols = [c for c in recent.columns if c in [
        "Target_Direction", "Target_LogReturn",
        "pred_direction", "pred_prob_up", "pred_log_return",
    ]]
    st.dataframe(
        recent[display_cols].tail(30).style.format("{:.4f}"),
        use_container_width=True,
    )

    # Accuracy summary
    if "Target_Direction" in recent.columns and "pred_direction" in recent.columns:
        correct = (recent["Target_Direction"] == recent["pred_direction"]).mean()
        st.metric("Directional Accuracy (displayed period)", f"{correct:.1%}")


# ═══════════════════════════════════════════════════════════════════
# PAGE 4: FEATURE ANALYSIS
# ═══════════════════════════════════════════════════════════════════

def page_features():
    st.title("Feature Analysis")

    importance = load_feature_importance(model_select, ticker_select)

    if importance.empty:
        st.info(f"Feature importance not available for {model_select.upper()}. "
                f"Only XGBoost provides built-in feature importance.")

        # Still show feature correlation if we have data
        st.subheader("Feature Correlation with Target")
        from features.pipeline import load_processed_data
        try:
            train = load_processed_data(ticker_select, "train")
            exclude = {"Open", "High", "Low", "Close", "Volume", "Ticker",
                       "Target_Direction", "Target_LogReturn"}
            feat_cols = [c for c in train.columns if c not in exclude]
            corr = train[feat_cols].corrwith(train["Target_LogReturn"]).dropna()
            top = corr.abs().nlargest(20)
            top_vals = corr.loc[top.index]

            fig = px.bar(
                x=top_vals.values, y=top_vals.index,
                orientation="h", title=f"{ticker_select} — Top 20 Features by Target Correlation",
                color=top_vals.values, color_continuous_scale="RdYlGn",
            )
            fig.update_layout(height=500, yaxis=dict(autorange="reversed"))
            st.plotly_chart(fig, use_container_width=True)
        except Exception:
            st.warning("Could not load processed feature data.")
        return

    # Feature importance bar chart
    st.subheader(f"{model_select.upper()} — {ticker_select} Feature Importance")
    top_n = st.slider("Top N features", 10, min(50, len(importance)), 25)
    top = importance.nlargest(top_n, "importance")

    fig = px.bar(
        top, x="importance", y="feature",
        orientation="h", title=f"Top {top_n} Features",
        color="importance", color_continuous_scale="Blues",
    )
    fig.update_layout(height=max(400, top_n * 22), yaxis=dict(autorange="reversed"))
    st.plotly_chart(fig, use_container_width=True)

    # Full table
    with st.expander("Full Feature Importance Table"):
        st.dataframe(importance, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════
# ROUTING
# ═══════════════════════════════════════════════════════════════════

if page == "Overview":
    page_overview()
elif page == "Backtest Results":
    page_backtest()
elif page == "Signal Explorer":
    page_signals()
elif page == "Feature Analysis":
    page_features()

# Footer
st.sidebar.divider()
st.sidebar.caption("NTU EEE FYP A1088-251 | ML & Quant Trading")
