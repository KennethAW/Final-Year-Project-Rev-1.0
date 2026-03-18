"""
Temporal Fusion Transformer (TFT)
===================================
Implements the TFT from Lim et al. (2021) using pytorch-forecasting.
Provides variable selection networks for interpretable feature importance
and temporal attention for understanding which past timesteps matter.
"""

import json
import logging
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

import torch
from torch.utils.data import DataLoader
import lightning.pytorch as pl
from lightning.pytorch.callbacks import EarlyStopping, LearningRateMonitor
from lightning.pytorch.loggers import CSVLogger

from pytorch_forecasting import (
    TemporalFusionTransformer,
    TimeSeriesDataSet,
    GroupNormalizer,
)
from pytorch_forecasting.metrics import (
    QuantileLoss,
    MAE,
    RMSE,
)
from pytorch_forecasting.data import NaNLabelEncoder

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    PRIMARY_TICKERS, FEATURES_DIR, MODELS_DIR, RESULTS_DIR,
    LOOKBACK_WINDOW, FORECAST_HORIZON, RANDOM_SEED,
    set_seeds,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
warnings.filterwarnings("ignore", ".*does not have many workers.*")


# ═══════════════════════════════════════════════════════════════════
# DATA PREPARATION
# ═══════════════════════════════════════════════════════════════════

class TFTDataPreparer:
    """
    Prepares data in the format required by pytorch-forecasting's
    TimeSeriesDataSet, separating known future inputs, observed past
    inputs, and static metadata.
    """

    # Features known in advance
    KNOWN_FEATURES = [
        "VIX", "VIX_MA5", "VIX_MA20", "VIX_High",
        "TNX_Yield", "TNX_MA20",
        "Market_Regime",
    ]

    # Calendar features
    CALENDAR_FEATURES = [
        "day_of_week", "month", "week_of_year",
    ]

    def __init__(
        self,
        max_encoder_length: int = LOOKBACK_WINDOW,
        max_prediction_length: int = FORECAST_HORIZON,
    ):
        self.max_encoder_length = max_encoder_length
        self.max_prediction_length = max_prediction_length

    def prepare(
        self,
        train_df: pd.DataFrame,
        val_df: pd.DataFrame,
        test_df: pd.DataFrame,
        ticker: str,
    ) -> Tuple[TimeSeriesDataSet, TimeSeriesDataSet, TimeSeriesDataSet, List[str], List[str]]:
        """
        Prepare pytorch-forecasting TimeSeriesDataSets from our pipeline output.

        Returns:
            (train_dataset, val_dataset, test_dataset, known_reals, unknown_reals)
        """
        all_dfs = []
        for split_name, df in [("train", train_df), ("val", val_df), ("test", test_df)]:
            df = df.copy()
            df["ticker"] = ticker
            df["time_idx"] = range(len(df))
            df["target"] = df["Target_LogReturn"]

            # Add calendar features
            df["day_of_week"] = df.index.dayofweek.astype(float)
            df["month"] = df.index.month.astype(float)
            df["week_of_year"] = df.index.isocalendar().week.astype(float)

            all_dfs.append(df)

        # Create continuous time index across all splits
        combined = pd.concat(all_dfs, ignore_index=False)
        combined["time_idx"] = range(len(combined))

        # Split back
        n_train = len(all_dfs[0])
        n_val = len(all_dfs[1])
        train_data = combined.iloc[:n_train].copy()
        val_data = combined.iloc[n_train : n_train + n_val].copy()
        test_data = combined.iloc[n_train + n_val :].copy()

        # Classify features
        exclude = {
            "Open", "High", "Low", "Close", "Volume", "Ticker",
            "Target_Direction", "Target_LogReturn",
            "ticker", "time_idx", "target",
            "day_of_week", "month", "week_of_year",
        }

        all_feature_cols = [c for c in train_data.columns if c not in exclude]

        known_reals = [f for f in self.KNOWN_FEATURES + self.CALENDAR_FEATURES
                       if f in train_data.columns]
        unknown_reals = [f for f in all_feature_cols if f not in known_reals]

        logger.info(f"Known future reals ({len(known_reals)}): {known_reals[:5]}...")
        logger.info(f"Unknown past reals ({len(unknown_reals)}): {unknown_reals[:5]}...")

        numeric_check_cols = known_reals + unknown_reals
        valid_known = [c for c in known_reals if train_data[c].dtype.kind in ("f", "i", "u")]
        valid_unknown = [c for c in unknown_reals if train_data[c].dtype.kind in ("f", "i", "u")]
        dropped = set(numeric_check_cols) - set(valid_known + valid_unknown)
        if dropped:
            logger.warning(f"  Dropped non-numeric columns: {dropped}")
        known_reals = valid_known
        unknown_reals = valid_unknown

        all_real_cols = known_reals + unknown_reals + ["target"]
        for df in [train_data, val_data, test_data]:
            for col in all_real_cols:
                df[col] = pd.to_numeric(df[col], errors="coerce").astype(float)
            df[all_real_cols] = df[all_real_cols].replace([np.inf, -np.inf], np.nan)
            df[all_real_cols] = df[all_real_cols].fillna(0.0)
            for col in all_real_cols:
                df[col] = df[col].clip(-10, 10)

        n_nan = sum(df[all_real_cols].isna().sum().sum() for df in [train_data, val_data, test_data])
        logger.info(f"  After cleaning: {len(known_reals)} known + {len(unknown_reals)} unknown reals, NaN remaining: {n_nan}")

        training = TimeSeriesDataSet(
            train_data,
            time_idx="time_idx",
            target="target",
            group_ids=["ticker"],
            max_encoder_length=self.max_encoder_length,
            max_prediction_length=self.max_prediction_length,
            static_categoricals=["ticker"],
            time_varying_known_reals=known_reals,
            time_varying_unknown_reals=unknown_reals + ["target"],
            target_normalizer=GroupNormalizer(
                groups=["ticker"],
            ),
            categorical_encoders={"ticker": NaNLabelEncoder(add_nan=True)},
            add_relative_time_idx=True,
            add_target_scales=True,
            add_encoder_length=True,
        )

        validation = TimeSeriesDataSet.from_dataset(
            training, val_data, predict=False, stop_randomization=True
        )
        testing = TimeSeriesDataSet.from_dataset(
            training, test_data, predict=False, stop_randomization=True
        )

        logger.info(f"Train samples: {len(training)}, Val: {len(validation)}, Test: {len(testing)}")

        return training, validation, testing, known_reals, unknown_reals


# ═══════════════════════════════════════════════════════════════════
# TRAINER
# ═══════════════════════════════════════════════════════════════════

class TFTTrainer:
    """
    Handles TFT training, evaluation, and interpretability analysis.
    """

    def __init__(
        self,
        max_encoder_length: int = LOOKBACK_WINDOW,
        max_prediction_length: int = FORECAST_HORIZON,
        hidden_size: int = 64,
        attention_head_size: int = 4,
        dropout: float = 0.1,
        hidden_continuous_size: int = 32,
        learning_rate: float = 1e-3,
        max_epochs: int = 50,
        patience: int = 8,
        batch_size: int = 64,
        seed: int = RANDOM_SEED,
        features_dir: Path = FEATURES_DIR,
        models_dir: Path = MODELS_DIR,
        results_dir: Path = RESULTS_DIR,
    ):
        self.max_encoder_length = max_encoder_length
        self.max_prediction_length = max_prediction_length
        self.hidden_size = hidden_size
        self.attention_head_size = attention_head_size
        self.dropout = dropout
        self.hidden_continuous_size = hidden_continuous_size
        self.learning_rate = learning_rate
        self.max_epochs = max_epochs
        self.patience = patience
        self.batch_size = batch_size
        self.seed = seed
        self.features_dir = features_dir
        self.models_dir = models_dir / "tft"
        self.results_dir = results_dir / "tft"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

        self.device = "gpu" if torch.cuda.is_available() else "cpu"

    # ── Data Loading ─────────────────────────────────────────────

    def _load_data(self, ticker: str) -> dict:
        """Load train/val/test splits."""
        splits = {}
        for split in ["train", "val", "test"]:
            path = self.features_dir / f"{ticker}_{split}.parquet"
            splits[split] = pd.read_parquet(path)
        return splits

    # ── Training ─────────────────────────────────────────────────

    def train_and_evaluate(self, ticker: str) -> dict:
        """
        Full pipeline: prepare data → train TFT → evaluate → extract attention.
        """
        set_seeds(self.seed)

        logger.info(f"\n{'='*60}")
        logger.info(f"TFT TRAINING — {ticker}")
        logger.info(f"{'='*60}")

        # Load and prepare data
        splits = self._load_data(ticker)
        preparer = TFTDataPreparer(
            self.max_encoder_length, self.max_prediction_length
        )
        training, validation, testing, known_reals, unknown_reals = preparer.prepare(
            splits["train"], splits["val"], splits["test"], ticker
        )

        # Create dataloaders
        train_loader = training.to_dataloader(
            train=True, batch_size=self.batch_size, num_workers=0
        )
        val_loader = validation.to_dataloader(
            train=False, batch_size=self.batch_size, num_workers=0
        )
        test_loader = testing.to_dataloader(
            train=False, batch_size=self.batch_size, num_workers=0
        )

        # Define TFT model
        tft = TemporalFusionTransformer.from_dataset(
            training,
            learning_rate=self.learning_rate,
            hidden_size=self.hidden_size,
            attention_head_size=self.attention_head_size,
            dropout=self.dropout,
            hidden_continuous_size=self.hidden_continuous_size,
            output_size=7,  # 7 quantiles by default
            loss=QuantileLoss(),
            log_interval=10,
            reduce_on_plateau_patience=4,
        )

        logger.info(f"TFT parameters: {tft.size() / 1e3:.1f}K")

        # Callbacks
        early_stop = EarlyStopping(
            monitor="val_loss",
            min_delta=1e-5,
            patience=self.patience,
            verbose=True,
            mode="min",
        )
        lr_monitor = LearningRateMonitor()

        # Logger
        csv_logger = CSVLogger(
            save_dir=str(self.results_dir),
            name=f"{ticker}_logs",
        )

        # Train
        trainer = pl.Trainer(
            max_epochs=self.max_epochs,
            accelerator=self.device,
            devices=1,
            gradient_clip_val=0.1,
            callbacks=[early_stop, lr_monitor],
            logger=csv_logger,
            enable_progress_bar=True,
            log_every_n_steps=10,
        )

        trainer.fit(tft, train_dataloaders=train_loader, val_dataloaders=val_loader)

        # Load best model
        best_model_path = trainer.checkpoint_callback.best_model_path
        if best_model_path:
            best_tft = TemporalFusionTransformer.load_from_checkpoint(best_model_path)
            logger.info(f"Loaded best model from: {best_model_path}")
        else:
            best_tft = tft

        # ── Evaluate ─────────────────────────────────────────────

        predictions = best_tft.predict(
            test_loader, return_x=True, return_index=True
        )

        pred_tensor = predictions.output
        if pred_tensor.ndim == 3:
            quantile_idx = 3  # median (q=0.5)
            pred_tensor = pred_tensor[:, :, quantile_idx]
        point_preds = pred_tensor.detach().cpu().numpy().flatten()

        actuals = torch.cat([y[0] for x, y in iter(test_loader)])
        actuals = actuals.detach().cpu().numpy().flatten()

        # Align lengths
        min_len = min(len(point_preds), len(actuals))
        point_preds = point_preds[:min_len]
        actuals = actuals[:min_len]

        # Compute metrics
        from sklearn.metrics import (
            mean_squared_error, mean_absolute_error, mean_absolute_percentage_error,
            accuracy_score, f1_score, matthews_corrcoef,
            precision_score, recall_score, roc_auc_score,
        )

        mape_mask = np.abs(actuals) > 1e-8
        mape_val = float(mean_absolute_percentage_error(
            actuals[mape_mask], point_preds[mape_mask]
        )) if mape_mask.sum() > 0 else 0.0

        reg_metrics = {
            "rmse": float(np.sqrt(mean_squared_error(actuals, point_preds))),
            "mae": float(mean_absolute_error(actuals, point_preds)),
            "mape": mape_val,
            "directional_accuracy": float(
                np.mean(np.sign(point_preds) == np.sign(actuals))
            ),
        }

        pred_direction = (point_preds > 0).astype(int)
        actual_direction = (actuals > 0).astype(int)
        pred_prob_up = 1.0 / (1.0 + np.exp(-100.0 * point_preds))

        clf_metrics = {
            "accuracy": float(accuracy_score(actual_direction, pred_direction)),
            "f1_macro": float(f1_score(actual_direction, pred_direction, average="macro")),
            "precision": float(precision_score(actual_direction, pred_direction, average="macro", zero_division=0)),
            "recall": float(recall_score(actual_direction, pred_direction, average="macro", zero_division=0)),
            "roc_auc": float(roc_auc_score(actual_direction, pred_prob_up)),
            "mcc": float(matthews_corrcoef(actual_direction, pred_direction)),
        }

        logger.info(f"Regression metrics: {reg_metrics}")
        logger.info(f"Classification metrics: {clf_metrics}")

        # ── Interpretability ─────────────────────────────────────

        interpretation = self._extract_interpretation(best_tft, test_loader)

        # ── Build Results ────────────────────────────────────────

        test_dates = splits["test"].index
        if len(test_dates) > min_len:
            test_dates = test_dates[-min_len:]

        results = {
            "ticker": ticker,
            "model": "TFT",
            "clf_test_metrics": clf_metrics,
            "reg_test_metrics": reg_metrics,
            "predictions": {
                "actuals": actuals,
                "point_preds": point_preds,
                "actual_direction": actual_direction,
                "pred_direction": pred_direction,
                "dates": test_dates,
            },
            "interpretation": interpretation,
            "n_parameters": tft.size(),
        }

        # Save
        self._save_artifacts(ticker, best_tft, results)

        return results

    def train_all(self, tickers: list = PRIMARY_TICKERS) -> Dict[str, dict]:
        """Train TFT for all tickers."""
        all_results = {}
        for ticker in tickers:
            try:
                all_results[ticker] = self.train_and_evaluate(ticker)
            except Exception as e:
                logger.error(f"Failed for {ticker}: {e}")
                import traceback
                traceback.print_exc()
        return all_results

    # ── Interpretability ─────────────────────────────────────────

    def _extract_interpretation(
        self, model: TemporalFusionTransformer, dataloader: DataLoader
    ) -> dict:
        """
        Extract TFT's interpretable outputs:
        1. Variable importance (encoder + decoder)
        2. Attention weights
        """
        try:
            raw_predictions = model.predict(
                dataloader, return_x=True, return_index=True, mode="raw"
            )
            raw_output = raw_predictions.output

            interpretation = model.interpret_output(raw_output, reduction="sum")

            result = {}

            if "encoder_variables" in interpretation:
                result["encoder_variable_importance"] = {
                    k: float(v) for k, v in
                    zip(model.encoder_variables,
                        interpretation["encoder_variables"].detach().cpu().numpy())
                }

            if "decoder_variables" in interpretation:
                result["decoder_variable_importance"] = {
                    k: float(v) for k, v in
                    zip(model.decoder_variables,
                        interpretation["decoder_variables"].detach().cpu().numpy())
                }

            if "static_variables" in interpretation:
                result["static_variable_importance"] = {
                    k: float(v) for k, v in
                    zip(model.static_variables,
                        interpretation["static_variables"].detach().cpu().numpy())
                }

            # Attention weights
            if "attention" in interpretation:
                result["attention_weights"] = (
                    interpretation["attention"].detach().cpu().numpy()
                )

            logger.info("Extracted TFT interpretation outputs")
            return result

        except Exception as e:
            logger.warning(f"Could not extract interpretation: {e}")
            import traceback
            traceback.print_exc()
            return {}

    # ── Persistence ──────────────────────────────────────────────

    def _save_artifacts(self, ticker, model, results):
        """Save model, metrics, interpretation, and predictions."""
        ticker_dir = self.models_dir / ticker
        ticker_dir.mkdir(parents=True, exist_ok=True)

        # Save model checkpoint
        torch.save(model.state_dict(), ticker_dir / "tft_model.pt")

        # Save metrics
        metrics = {
            "ticker": ticker,
            "clf_test": results["clf_test_metrics"],
            "reg_test": results["reg_test_metrics"],
            "n_parameters": results["n_parameters"],
        }
        with open(self.results_dir / f"{ticker}_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2, default=str)

        point_preds = results["predictions"]["point_preds"]
        pred_direction = results["predictions"]["pred_direction"]
        test_dates = results["predictions"]["dates"]

        pred_prob_up = 1.0 / (1.0 + np.exp(-100.0 * np.array(point_preds)))

        pred_df = pd.DataFrame({
            "Target_Direction": results["predictions"]["actual_direction"],
            "Target_LogReturn": results["predictions"]["actuals"],
            "pred_direction": pred_direction,
            "pred_prob_up": pred_prob_up,
            "pred_log_return": point_preds,
        }, index=test_dates)
        pred_df.to_parquet(self.results_dir / f"{ticker}_predictions.parquet")

        # Save interpretation
        if results["interpretation"]:
            interp = results["interpretation"]

            if "encoder_variable_importance" in interp:
                imp_df = pd.DataFrame([
                    {"feature": k, "importance": v}
                    for k, v in interp["encoder_variable_importance"].items()
                ]).sort_values("importance", ascending=False)
                imp_df.to_csv(
                    self.results_dir / f"{ticker}_encoder_importance.csv", index=False
                )

            if "decoder_variable_importance" in interp:
                imp_df = pd.DataFrame([
                    {"feature": k, "importance": v}
                    for k, v in interp["decoder_variable_importance"].items()
                ]).sort_values("importance", ascending=False)
                imp_df.to_csv(
                    self.results_dir / f"{ticker}_decoder_importance.csv", index=False
                )

            if "attention_weights" in interp:
                np.save(
                    self.results_dir / f"{ticker}_attention_weights.npy",
                    interp["attention_weights"],
                )

        logger.info(f"Saved all TFT artifacts for {ticker}")


# ═══════════════════════════════════════════════════════════════════
# TFT-SPECIFIC VISUALISATIONS
# ═══════════════════════════════════════════════════════════════════

def plot_variable_importance(
    importance: dict,
    title: str = "TFT Variable Importance",
    top_n: int = 20,
    save_path: Optional[Path] = None,
):
    """Plot TFT variable importance from the Variable Selection Network."""
    import matplotlib.pyplot as plt

    sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:top_n]
    names = [x[0] for x in sorted_imp]
    values = [x[1] for x in sorted_imp]

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.barh(range(len(names)), values, color="steelblue", alpha=0.8)
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names)
    ax.set_xlabel("Variable Importance Score")
    ax.set_title(title, fontsize=14)
    ax.invert_yaxis()
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


def plot_attention_weights(
    attention: np.ndarray,
    title: str = "TFT Temporal Attention Weights",
    save_path: Optional[Path] = None,
):
    """Plot attention weight heatmap showing temporal focus patterns."""
    import matplotlib.pyplot as plt
    import seaborn as sns

    # Average across samples and heads
    if attention.ndim == 3:
        avg_attention = attention.mean(axis=(0, 1))  # (encoder_length,)
    elif attention.ndim == 2:
        avg_attention = attention.mean(axis=0)
    else:
        avg_attention = attention

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Line plot
    ax = axes[0]
    timesteps = range(len(avg_attention))
    ax.plot(timesteps, avg_attention, color="steelblue", linewidth=2)
    ax.fill_between(timesteps, avg_attention, alpha=0.2, color="steelblue")
    ax.set_xlabel("Timestep (days before prediction)")
    ax.set_ylabel("Average Attention Weight")
    ax.set_title(f"{title} — Average", fontsize=13)

    # Heatmap (first 50 samples)
    ax = axes[1]
    if attention.ndim == 3:
        sample_att = attention[:50].mean(axis=1)  # Average across heads
    elif attention.ndim == 2:
        sample_att = attention[:50]
    else:
        sample_att = attention.reshape(1, -1)

    sns.heatmap(
        sample_att, cmap="Blues", ax=ax,
        xticklabels=5, yticklabels=10,
    )
    ax.set_xlabel("Timestep")
    ax.set_ylabel("Sample")
    ax.set_title(f"{title} — Sample Heatmap", fontsize=13)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


# ═══════════════════════════════════════════════════════════════════
# RESULTS AGGREGATION
# ═══════════════════════════════════════════════════════════════════

def aggregate_tft_results(results: Dict[str, dict]) -> pd.DataFrame:
    """Combine TFT results across tickers."""
    rows = []
    for ticker, res in results.items():
        row = {"Ticker": ticker}
        for k, v in res["clf_test_metrics"].items():
            row[f"Clf_{k}"] = v
        for k, v in res["reg_test_metrics"].items():
            row[f"Reg_{k}"] = v
        row["Parameters"] = res.get("n_parameters", 0)
        rows.append(row)

    df = pd.DataFrame(rows)
    mean_row = {"Ticker": "MEAN"}
    for col in df.columns:
        if col != "Ticker":
            mean_row[col] = df[col].mean()
    df = pd.concat([df, pd.DataFrame([mean_row])], ignore_index=True)
    return df


if __name__ == "__main__":
    trainer = TFTTrainer(max_epochs=30)
    results = trainer.train_all()

    summary = aggregate_tft_results(results)
    print("\n" + "=" * 90)
    print("TFT RESULTS SUMMARY (Test Set)")
    print("=" * 90)
    print(summary.to_string(index=False, float_format="%.4f"))
