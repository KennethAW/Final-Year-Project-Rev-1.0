"""
LSTM Model
===========
2-layer LSTM with dropout for both classification (next-day direction)
and regression (next-day log return) tasks.
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    PRIMARY_TICKERS, FEATURES_DIR, MODELS_DIR, RESULTS_DIR,
    LOOKBACK_WINDOW, RANDOM_SEED,
    LSTM_HIDDEN_SIZE, LSTM_NUM_LAYERS, LSTM_DROPOUT,
    LSTM_LR, LSTM_EPOCHS, LSTM_PATIENCE,
    set_seeds,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


# ═══════════════════════════════════════════════════════════════════
# DATASET
# ═══════════════════════════════════════════════════════════════════

class TimeSeriesDataset(Dataset):
    """
    Converts a DataFrame into overlapping sequences for LSTM input.

    Each sample is a (sequence, target) pair where:
    - sequence: (lookback_window, n_features) tensor
    - target: scalar (direction or log return)
    """

    def __init__(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str,
        lookback: int = LOOKBACK_WINDOW,
    ):
        self.lookback = lookback
        self.target_col = target_col

        features = df[feature_cols].values.astype(np.float32)
        features = np.nan_to_num(features, nan=0.0, posinf=10.0, neginf=-10.0)
        targets = df[target_col].values.astype(np.float32)
        targets = np.nan_to_num(targets, nan=0.0, posinf=1.0, neginf=-1.0)

        # Build sequences
        self.X = []
        self.y = []
        self.dates = []

        for i in range(lookback, len(features)):
            self.X.append(features[i - lookback : i])
            self.y.append(targets[i])
            self.dates.append(df.index[i])

        self.X = np.array(self.X)
        self.y = np.array(self.y)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return (
            torch.tensor(self.X[idx], dtype=torch.float32),
            torch.tensor(self.y[idx], dtype=torch.float32),
        )


# ═══════════════════════════════════════════════════════════════════
# MODEL ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════

class LSTMClassifier(nn.Module):
    """2-layer LSTM for binary classification."""

    def __init__(
        self,
        input_size: int,
        hidden_size: int = LSTM_HIDDEN_SIZE,
        num_layers: int = LSTM_NUM_LAYERS,
        dropout: float = LSTM_DROPOUT,
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        # x: (batch, seq_len, features)
        lstm_out, (h_n, _) = self.lstm(x)
        # Use last hidden state of final layer
        last_hidden = h_n[-1]  # (batch, hidden_size)
        out = self.dropout(last_hidden)
        out = self.fc(out)
        return out.squeeze(-1)  # (batch,)


class LSTMRegressor(nn.Module):
    """2-layer LSTM for regression."""

    def __init__(
        self,
        input_size: int,
        hidden_size: int = LSTM_HIDDEN_SIZE,
        num_layers: int = LSTM_NUM_LAYERS,
        dropout: float = LSTM_DROPOUT,
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x):
        lstm_out, (h_n, _) = self.lstm(x)
        last_hidden = h_n[-1]
        out = self.dropout(last_hidden)
        out = self.fc(out)
        return out.squeeze(-1)


# ═══════════════════════════════════════════════════════════════════
# TRAINER
# ═══════════════════════════════════════════════════════════════════

class LSTMTrainer:
    """
    Handles training, evaluation, and artifact saving for LSTM models.
    """

    def __init__(
        self,
        lookback: int = LOOKBACK_WINDOW,
        hidden_size: int = LSTM_HIDDEN_SIZE,
        num_layers: int = LSTM_NUM_LAYERS,
        dropout: float = LSTM_DROPOUT,
        lr: float = LSTM_LR,
        epochs: int = LSTM_EPOCHS,
        patience: int = LSTM_PATIENCE,
        batch_size: int = 64,
        seed: int = RANDOM_SEED,
        features_dir: Path = FEATURES_DIR,
        models_dir: Path = MODELS_DIR,
        results_dir: Path = RESULTS_DIR,
    ):
        self.lookback = lookback
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.dropout = dropout
        self.lr = lr
        self.epochs = epochs
        self.patience = patience
        self.batch_size = batch_size
        self.seed = seed
        self.features_dir = features_dir
        self.models_dir = models_dir / "lstm"
        self.results_dir = results_dir / "lstm"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")

    # ── Data Loading ─────────────────────────────────────────────

    def _load_data(self, ticker: str) -> Tuple[dict, list]:
        """Load train/val/test splits and identify feature columns."""
        splits = {}
        for split in ["train", "val", "test"]:
            path = self.features_dir / f"{ticker}_{split}.parquet"
            splits[split] = pd.read_parquet(path)

        exclude = {"Open", "High", "Low", "Close", "Volume", "Ticker",
                    "Target_Direction", "Target_LogReturn"}
        feature_cols = [c for c in splits["train"].columns if c not in exclude]

        numeric_cols = []
        for c in feature_cols:
            if splits["train"][c].dtype.kind in ("f", "i", "u"):  # float, int, unsigned
                numeric_cols.append(c)
            else:
                logger.warning(f"  Dropping non-numeric column: {c} (dtype={splits['train'][c].dtype})")
        feature_cols = numeric_cols

        for split in splits:
            df = splits[split]
            df[feature_cols] = df[feature_cols].replace([np.inf, -np.inf], np.nan)
            df[feature_cols] = df[feature_cols].fillna(0.0)
            for c in feature_cols:
                df[c] = df[c].clip(-10, 10)
            df["Target_Direction"] = df["Target_Direction"].fillna(0).astype(float)
            df["Target_LogReturn"] = df["Target_LogReturn"].fillna(0.0)
            splits[split] = df

        n_nan = sum(splits[s][feature_cols].isna().sum().sum() for s in splits)
        n_inf = sum(np.isinf(splits[s][feature_cols].values).sum() for s in splits)
        logger.info(f"  Data loaded for {ticker}: {len(feature_cols)} features, NaN remaining: {n_nan}, Inf remaining: {n_inf}")

        return splits, feature_cols

    def _create_dataloaders(
        self, splits: dict, feature_cols: list, target_col: str
    ) -> Tuple[DataLoader, DataLoader, DataLoader]:
        """Create DataLoaders for train/val/test."""
        train_ds = TimeSeriesDataset(splits["train"], feature_cols, target_col, self.lookback)
        val_ds = TimeSeriesDataset(splits["val"], feature_cols, target_col, self.lookback)
        test_ds = TimeSeriesDataset(splits["test"], feature_cols, target_col, self.lookback)

        train_loader = DataLoader(train_ds, batch_size=self.batch_size, shuffle=True,
                                  drop_last=False, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=self.batch_size, shuffle=False, num_workers=0)
        test_loader = DataLoader(test_ds, batch_size=self.batch_size, shuffle=False, num_workers=0)

        return train_loader, val_loader, test_loader

    # ── Training Loop ────────────────────────────────────────────

    def _train_model(
        self,
        model: nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        criterion: nn.Module,
        task: str,
    ) -> Tuple[nn.Module, dict]:
        """
        Train with AdamW, ReduceLROnPlateau, early stopping, gradient clipping.

        Returns trained model and training history.
        """
        set_seeds(self.seed)
        model = model.to(self.device)

        optimizer = torch.optim.AdamW(model.parameters(), lr=self.lr, weight_decay=1e-5)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", patience=5, factor=0.5
        )

        history = {"train_loss": [], "val_loss": [], "lr": []}
        best_val_loss = float("inf")
        best_state = None
        patience_counter = 0

        for epoch in range(1, self.epochs + 1):
            # ── Train ──
            model.train()
            train_losses = []
            for X_batch, y_batch in train_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                optimizer.zero_grad()
                X_batch = torch.nan_to_num(X_batch, nan=0.0, posinf=10.0, neginf=-10.0)
                output = model(X_batch)

                if task == "classification":
                    loss = criterion(output, y_batch)
                else:
                    loss = criterion(output, y_batch)

                if torch.isnan(loss) or torch.isinf(loss):
                    logger.warning(f"  NaN/Inf loss detected in batch — skipping")
                    continue

                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                train_losses.append(loss.item())

            avg_train_loss = np.mean(train_losses)

            # ── Validate ──
            model.eval()
            val_losses = []
            with torch.no_grad():
                for X_batch, y_batch in val_loader:
                    X_batch = X_batch.to(self.device)
                    y_batch = y_batch.to(self.device)
                    output = model(X_batch)
                    loss = criterion(output, y_batch)
                    val_losses.append(loss.item())

            avg_val_loss = np.mean(val_losses)
            current_lr = optimizer.param_groups[0]["lr"]

            history["train_loss"].append(avg_train_loss)
            history["val_loss"].append(avg_val_loss)
            history["lr"].append(current_lr)

            scheduler.step(avg_val_loss)

            # Early stopping
            if avg_val_loss < best_val_loss:
                best_val_loss = avg_val_loss
                best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1

            if epoch % 10 == 0 or epoch == 1:
                logger.info(
                    f"  Epoch {epoch:3d}/{self.epochs} | "
                    f"Train: {avg_train_loss:.6f} | Val: {avg_val_loss:.6f} | "
                    f"LR: {current_lr:.6f} | Patience: {patience_counter}/{self.patience}"
                )

            if patience_counter >= self.patience:
                logger.info(f"  Early stopping at epoch {epoch}")
                break

        if best_state is not None:
            model.load_state_dict(best_state)
            model = model.to(self.device)

        logger.info(f"  Best val loss: {best_val_loss:.6f}")
        return model, history

    # ── Evaluation ───────────────────────────────────────────────

    def _predict(self, model: nn.Module, loader: DataLoader) -> np.ndarray:
        """Get raw model outputs for a DataLoader."""
        model.eval()
        preds = []
        with torch.no_grad():
            for X_batch, _ in loader:
                X_batch = X_batch.to(self.device)
                output = model(X_batch)
                preds.append(output.cpu().numpy())
        return np.concatenate(preds)

    def _evaluate_classification(
        self, model: nn.Module, loader: DataLoader
    ) -> Tuple[dict, np.ndarray, np.ndarray]:
        """Evaluate classification model and return metrics + predictions."""
        from sklearn.metrics import (
            accuracy_score, f1_score, precision_score, recall_score,
            roc_auc_score, matthews_corrcoef,
        )

        raw_preds = self._predict(model, loader)
        probs = 1 / (1 + np.exp(-raw_preds))  # Sigmoid
        pred_labels = (probs >= 0.5).astype(int)

        y_true = np.concatenate([y.numpy() for _, y in loader])

        metrics = {
            "accuracy": accuracy_score(y_true, pred_labels),
            "f1_macro": f1_score(y_true, pred_labels, average="macro"),
            "precision": precision_score(y_true, pred_labels, average="macro", zero_division=0),
            "recall": recall_score(y_true, pred_labels, average="macro", zero_division=0),
            "roc_auc": roc_auc_score(y_true, probs),
            "mcc": matthews_corrcoef(y_true, pred_labels),
        }

        return metrics, pred_labels, probs

    def _evaluate_regression(
        self, model: nn.Module, loader: DataLoader
    ) -> Tuple[dict, np.ndarray]:
        """Evaluate regression model and return metrics + predictions."""
        from sklearn.metrics import mean_squared_error, mean_absolute_error

        preds = self._predict(model, loader)
        y_true = np.concatenate([y.numpy() for _, y in loader])

        da = np.mean(np.sign(preds) == np.sign(y_true))
        mask = np.abs(y_true) > 1e-8
        mape = np.mean(np.abs((y_true[mask] - preds[mask]) / y_true[mask])) if mask.sum() > 0 else float("nan")

        metrics = {
            "rmse": float(np.sqrt(mean_squared_error(y_true, preds))),
            "mae": float(mean_absolute_error(y_true, preds)),
            "mape": float(mape),
            "directional_accuracy": float(da),
        }

        return metrics, preds

    # ── Full Pipeline ────────────────────────────────────────────

    def train_and_evaluate(self, ticker: str) -> dict:
        """
        Full pipeline: create datasets, train clf + reg, evaluate, save.
        """
        set_seeds(self.seed)
        splits, feature_cols = self._load_data(ticker)
        n_features = len(feature_cols)
        results = {"ticker": ticker, "model": "LSTM"}

        # ── Classification ───────────────────────────────────────
        logger.info(f"\n{'='*50}")
        logger.info(f"LSTM CLASSIFICATION — {ticker}")
        logger.info(f"{'='*50}")

        train_loader, val_loader, test_loader = self._create_dataloaders(
            splits, feature_cols, "Target_Direction"
        )

        clf_model = LSTMClassifier(input_size=n_features)
        criterion_clf = nn.BCEWithLogitsLoss()

        clf_model, clf_history = self._train_model(
            clf_model, train_loader, val_loader, criterion_clf, "classification"
        )

        clf_val_metrics, _, _ = self._evaluate_classification(clf_model, val_loader)
        clf_test_metrics, pred_labels, pred_probs = self._evaluate_classification(clf_model, test_loader)

        results["clf_val_metrics"] = clf_val_metrics
        results["clf_test_metrics"] = clf_test_metrics
        results["clf_history"] = clf_history

        logger.info(f"Val  metrics: {clf_val_metrics}")
        logger.info(f"Test metrics: {clf_test_metrics}")

        # ── Regression ───────────────────────────────────────────
        logger.info(f"\n{'='*50}")
        logger.info(f"LSTM REGRESSION — {ticker}")
        logger.info(f"{'='*50}")

        train_loader_r, val_loader_r, test_loader_r = self._create_dataloaders(
            splits, feature_cols, "Target_LogReturn"
        )

        reg_model = LSTMRegressor(input_size=n_features)
        criterion_reg = nn.MSELoss()

        reg_model, reg_history = self._train_model(
            reg_model, train_loader_r, val_loader_r, criterion_reg, "regression"
        )

        reg_val_metrics, _ = self._evaluate_regression(reg_model, val_loader_r)
        reg_test_metrics, reg_preds = self._evaluate_regression(reg_model, test_loader_r)

        results["reg_val_metrics"] = reg_val_metrics
        results["reg_test_metrics"] = reg_test_metrics
        results["reg_history"] = reg_history

        logger.info(f"Val  metrics: {reg_val_metrics}")
        logger.info(f"Test metrics: {reg_test_metrics}")

        # ── Build predictions DataFrame ──────────────────────────
        test_ds = TimeSeriesDataset(splits["test"], feature_cols, "Target_Direction", self.lookback)
        test_dates = test_ds.dates
        test_targets_dir = test_ds.y
        test_ds_r = TimeSeriesDataset(splits["test"], feature_cols, "Target_LogReturn", self.lookback)
        test_targets_reg = test_ds_r.y

        pred_df = pd.DataFrame({
            "Target_Direction": test_targets_dir,
            "Target_LogReturn": test_targets_reg,
            "pred_direction": pred_labels,
            "pred_prob_up": pred_probs,
            "pred_log_return": reg_preds,
        }, index=test_dates)
        results["predictions"] = pred_df

        # ── Save Artifacts ───────────────────────────────────────
        self._save_artifacts(ticker, clf_model, reg_model, results)

        return results

    def train_all(self, tickers: list = PRIMARY_TICKERS) -> Dict[str, dict]:
        """Train and evaluate LSTM for all tickers."""
        all_results = {}
        for ticker in tickers:
            try:
                all_results[ticker] = self.train_and_evaluate(ticker)
            except Exception as e:
                logger.error(f"Failed for {ticker}: {e}")
                import traceback
                traceback.print_exc()
        return all_results

    # ── Persistence ──────────────────────────────────────────────

    def _save_artifacts(self, ticker, clf_model, reg_model, results):
        """Save models, metrics, history, and predictions."""
        ticker_dir = self.models_dir / ticker
        ticker_dir.mkdir(parents=True, exist_ok=True)

        # Save model weights
        torch.save(clf_model.state_dict(), ticker_dir / "clf_model.pt")
        torch.save(reg_model.state_dict(), ticker_dir / "reg_model.pt")

        # Save metrics
        metrics = {
            "ticker": ticker,
            "clf_val": results["clf_val_metrics"],
            "clf_test": results["clf_test_metrics"],
            "reg_val": results["reg_val_metrics"],
            "reg_test": results["reg_test_metrics"],
        }
        with open(self.results_dir / f"{ticker}_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2, default=str)

        # Save training history
        for task in ["clf", "reg"]:
            history = results[f"{task}_history"]
            hist_df = pd.DataFrame(history)
            hist_df.to_csv(self.results_dir / f"{ticker}_{task}_history.csv", index=False)

        # Save predictions
        results["predictions"].to_parquet(self.results_dir / f"{ticker}_predictions.parquet")

        logger.info(f"Saved all artifacts for {ticker}")


# ═══════════════════════════════════════════════════════════════════
# VISUALISATION HELPERS
# ═══════════════════════════════════════════════════════════════════

def plot_training_history(
    history: dict,
    title: str = "Training History",
    save_path: Optional[Path] = None,
):
    """Plot training and validation loss curves."""
    import matplotlib.pyplot as plt

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Loss curves
    ax = axes[0]
    ax.plot(history["train_loss"], label="Train", color="steelblue")
    ax.plot(history["val_loss"], label="Validation", color="orange")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.set_title(f"{title} — Loss")
    ax.legend()

    # Learning rate
    ax = axes[1]
    ax.plot(history["lr"], color="green")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Learning Rate")
    ax.set_title(f"{title} — Learning Rate Schedule")

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, bbox_inches="tight", dpi=150)
    plt.close()


# ═══════════════════════════════════════════════════════════════════
# RESULTS AGGREGATION
# ═══════════════════════════════════════════════════════════════════

def aggregate_lstm_results(results: Dict[str, dict]) -> pd.DataFrame:
    """Combine results across tickers into a summary table."""
    rows = []
    for ticker, res in results.items():
        row = {"Ticker": ticker}
        for k, v in res["clf_test_metrics"].items():
            row[f"Clf_{k}"] = v
        for k, v in res["reg_test_metrics"].items():
            row[f"Reg_{k}"] = v
        rows.append(row)

    df = pd.DataFrame(rows)
    mean_row = {"Ticker": "MEAN"}
    for col in df.columns:
        if col != "Ticker":
            mean_row[col] = df[col].mean()
    df = pd.concat([df, pd.DataFrame([mean_row])], ignore_index=True)

    return df


if __name__ == "__main__":
    trainer = LSTMTrainer(epochs=50)  # Reduce for quick test
    results = trainer.train_all()

    summary = aggregate_lstm_results(results)
    print("\n" + "=" * 90)
    print("LSTM RESULTS SUMMARY (Test Set)")
    print("=" * 90)
    print(summary.to_string(index=False, float_format="%.4f"))
