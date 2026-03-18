"""
PatchTST Model
================
Custom PyTorch implementation of PatchTST (Nie et al., 2023).
Segments time series into patches before applying Transformer encoder
layers, reducing computation and improving long-range dependency capture.
"""

import json
import logging
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    PRIMARY_TICKERS, FEATURES_DIR, MODELS_DIR, RESULTS_DIR,
    LOOKBACK_WINDOW, RANDOM_SEED,
    set_seeds,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


# ═══════════════════════════════════════════════════════════════════
# DATASET
# ═══════════════════════════════════════════════════════════════════

class PatchTSTDataset(Dataset):
    """Time series dataset that produces (sequence, target) pairs."""

    def __init__(
        self,
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str,
        seq_len: int = LOOKBACK_WINDOW,
    ):
        self.seq_len = seq_len
        features = df[feature_cols].values.astype(np.float32)
        features = np.nan_to_num(features, nan=0.0, posinf=10.0, neginf=-10.0)
        targets = df[target_col].values.astype(np.float32)
        targets = np.nan_to_num(targets, nan=0.0, posinf=1.0, neginf=-1.0)

        self.X, self.y, self.dates = [], [], []
        for i in range(seq_len, len(features)):
            self.X.append(features[i - seq_len : i])
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

class PatchEmbedding(nn.Module):
    """
    Segment time series into patches and project to d_model.

    Input:  (batch, seq_len, n_features)
    Output: (batch, n_patches, d_model)
    """

    def __init__(self, n_features: int, patch_len: int, stride: int, d_model: int):
        super().__init__()
        self.patch_len = patch_len
        self.stride = stride
        self.proj = nn.Linear(patch_len * n_features, d_model)

    def forward(self, x):
        # x: (batch, seq_len, n_features)
        batch, seq_len, n_features = x.shape

        # Unfold into patches: (batch, n_patches, patch_len, n_features)
        patches = x.unfold(dimension=1, size=self.patch_len, step=self.stride)
        # patches: (batch, n_patches, n_features, patch_len)
        n_patches = patches.shape[1]

        # Flatten each patch: (batch, n_patches, patch_len * n_features)
        patches = patches.permute(0, 1, 3, 2).contiguous()
        patches = patches.view(batch, n_patches, -1)

        # Project: (batch, n_patches, d_model)
        return self.proj(patches), n_patches


class PositionalEncoding(nn.Module):
    """Standard sinusoidal positional encoding."""

    def __init__(self, d_model: int, max_len: int = 500, dropout: float = 0.1):
        super().__init__()
        self.dropout = nn.Dropout(dropout)

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model)
        )
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)  # (1, max_len, d_model)
        self.register_buffer("pe", pe)

    def forward(self, x):
        # x: (batch, seq_len, d_model)
        x = x + self.pe[:, : x.size(1)]
        return self.dropout(x)


class PatchTST(nn.Module):
    """Patch-based Time Series Transformer."""

    def __init__(
        self,
        n_features: int,
        seq_len: int = 20,
        patch_len: int = 4,
        stride: int = 2,
        d_model: int = 128,
        n_heads: int = 4,
        n_layers: int = 3,
        d_ff: int = 256,
        dropout: float = 0.2,
        task: str = "regression",  # 'regression' or 'classification'
    ):
        super().__init__()
        self.task = task

        # Patch embedding
        self.patch_embed = PatchEmbedding(n_features, patch_len, stride, d_model)

        # Compute number of patches
        self.n_patches = (seq_len - patch_len) // stride + 1

        # Positional encoding
        self.pos_enc = PositionalEncoding(d_model, max_len=self.n_patches + 10, dropout=dropout)

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_ff,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        # Layer norm
        self.norm = nn.LayerNorm(d_model)

        # Output head
        self.flatten = nn.Flatten()
        self.head = nn.Sequential(
            nn.Linear(self.n_patches * d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 1),
        )

    def forward(self, x):
        """
        x: (batch, seq_len, n_features)
        returns: (batch,) — scalar prediction per sample
        """
        # Patch + embed
        x, _ = self.patch_embed(x)  # (batch, n_patches, d_model)

        # Positional encoding
        x = self.pos_enc(x)

        # Transformer
        x = self.transformer(x)  # (batch, n_patches, d_model)
        x = self.norm(x)

        # Flatten and predict
        x = self.flatten(x)  # (batch, n_patches * d_model)
        x = self.head(x)     # (batch, 1)
        return x.squeeze(-1)  # (batch,)

    def get_attention_weights(self, x):
        """
        Extract attention weights from all layers for interpretability.
        Returns list of (batch, n_heads, n_patches, n_patches) tensors.
        """
        x, _ = self.patch_embed(x)
        x = self.pos_enc(x)

        attention_weights = []
        for layer in self.transformer.layers:
            # Get attention weights from self-attention
            attn_output, attn_weight = layer.self_attn(
                x, x, x, need_weights=True, average_attn_weights=False
            )
            attention_weights.append(attn_weight.detach().cpu())
            # Continue forward pass
            x = layer(x)

        return attention_weights


# ═══════════════════════════════════════════════════════════════════
# TRAINER
# ═══════════════════════════════════════════════════════════════════

class PatchTSTTrainer:
    """Training, evaluation, and artifact management for PatchTST."""

    def __init__(
        self,
        seq_len: int = LOOKBACK_WINDOW,
        patch_len: int = 4,
        stride: int = 2,
        d_model: int = 128,
        n_heads: int = 4,
        n_layers: int = 3,
        d_ff: int = 256,
        dropout: float = 0.2,
        lr: float = 5e-4,
        epochs: int = 100,
        patience: int = 10,
        batch_size: int = 64,
        seed: int = RANDOM_SEED,
        features_dir: Path = FEATURES_DIR,
        models_dir: Path = MODELS_DIR,
        results_dir: Path = RESULTS_DIR,
    ):
        self.seq_len = seq_len
        self.patch_len = patch_len
        self.stride = stride
        self.d_model = d_model
        self.n_heads = n_heads
        self.n_layers = n_layers
        self.d_ff = d_ff
        self.dropout = dropout
        self.lr = lr
        self.epochs = epochs
        self.patience = patience
        self.batch_size = batch_size
        self.seed = seed
        self.features_dir = features_dir
        self.models_dir = models_dir / "patchtst"
        self.results_dir = results_dir / "patchtst"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")

    def _load_data(self, ticker: str) -> Tuple[dict, list]:
        splits = {}
        for split in ["train", "val", "test"]:
            path = self.features_dir / f"{ticker}_{split}.parquet"
            splits[split] = pd.read_parquet(path)

        exclude = {"Open", "High", "Low", "Close", "Volume", "Ticker",
                    "Target_Direction", "Target_LogReturn"}
        feature_cols = [c for c in splits["train"].columns if c not in exclude]

        numeric_cols = []
        for c in feature_cols:
            if splits["train"][c].dtype.kind in ("f", "i", "u"):
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
        train_ds = PatchTSTDataset(splits["train"], feature_cols, target_col, self.seq_len)
        val_ds = PatchTSTDataset(splits["val"], feature_cols, target_col, self.seq_len)
        test_ds = PatchTSTDataset(splits["test"], feature_cols, target_col, self.seq_len)

        train_loader = DataLoader(train_ds, batch_size=self.batch_size, shuffle=True, num_workers=0)
        val_loader = DataLoader(val_ds, batch_size=self.batch_size, shuffle=False, num_workers=0)
        test_loader = DataLoader(test_ds, batch_size=self.batch_size, shuffle=False, num_workers=0)
        return train_loader, val_loader, test_loader

    def _train_model(
        self, model: nn.Module, train_loader, val_loader, criterion, task: str
    ) -> Tuple[nn.Module, dict]:
        """Train with AdamW, cosine annealing, early stopping, gradient clipping."""
        set_seeds(self.seed)
        model = model.to(self.device)

        optimizer = torch.optim.AdamW(model.parameters(), lr=self.lr, weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
            optimizer, T_0=10, T_mult=2, eta_min=1e-6
        )

        history = {"train_loss": [], "val_loss": [], "lr": []}
        best_val_loss = float("inf")
        best_state = None
        patience_counter = 0

        for epoch in range(1, self.epochs + 1):
            # Train
            model.train()
            train_losses = []
            for X_batch, y_batch in train_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                optimizer.zero_grad()
                X_batch = torch.nan_to_num(X_batch, nan=0.0, posinf=10.0, neginf=-10.0)
                output = model(X_batch)
                loss = criterion(output, y_batch)

                if torch.isnan(loss) or torch.isinf(loss):
                    logger.warning(f"  NaN/Inf loss detected in batch — skipping")
                    continue

                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                train_losses.append(loss.item())

            scheduler.step()
            avg_train = np.mean(train_losses)

            # Validate
            model.eval()
            val_losses = []
            with torch.no_grad():
                for X_batch, y_batch in val_loader:
                    X_batch = torch.nan_to_num(X_batch, nan=0.0, posinf=10.0, neginf=-10.0)
                    X_batch = X_batch.to(self.device)
                    y_batch = y_batch.to(self.device)
                    output = model(X_batch)
                    loss = criterion(output, y_batch)
                    if not (torch.isnan(loss) or torch.isinf(loss)):
                        val_losses.append(loss.item())

            avg_val = np.mean(val_losses)
            current_lr = optimizer.param_groups[0]["lr"]

            history["train_loss"].append(avg_train)
            history["val_loss"].append(avg_val)
            history["lr"].append(current_lr)

            if avg_val < best_val_loss:
                best_val_loss = avg_val
                best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
                patience_counter = 0
            else:
                patience_counter += 1

            if epoch % 10 == 0 or epoch == 1:
                logger.info(
                    f"  Epoch {epoch:3d}/{self.epochs} | "
                    f"Train: {avg_train:.6f} | Val: {avg_val:.6f} | "
                    f"LR: {current_lr:.6f} | Patience: {patience_counter}/{self.patience}"
                )

            if patience_counter >= self.patience:
                logger.info(f"  Early stopping at epoch {epoch}")
                break

        if best_state:
            model.load_state_dict(best_state)
            model = model.to(self.device)

        logger.info(f"  Best val loss: {best_val_loss:.6f}")
        return model, history

    def _predict(self, model, loader):
        model.eval()
        preds = []
        with torch.no_grad():
            for X_batch, _ in loader:
                X_batch = torch.nan_to_num(X_batch, nan=0.0, posinf=10.0, neginf=-10.0)
                X_batch = X_batch.to(self.device)
                out = model(X_batch).cpu().numpy()
                out = np.nan_to_num(out, nan=0.0, posinf=1.0, neginf=-1.0)
                preds.append(out)
        return np.concatenate(preds)

    def _evaluate_classification(self, model, loader):
        from sklearn.metrics import (
            accuracy_score, f1_score, roc_auc_score, matthews_corrcoef,
            precision_score, recall_score,
        )

        raw = self._predict(model, loader)
        probs = 1 / (1 + np.exp(-raw))
        pred_labels = (probs >= 0.5).astype(int)
        y_true = np.concatenate([y.numpy() for _, y in loader])

        return {
            "accuracy": accuracy_score(y_true, pred_labels),
            "f1_macro": f1_score(y_true, pred_labels, average="macro"),
            "precision": precision_score(y_true, pred_labels, average="macro", zero_division=0),
            "recall": recall_score(y_true, pred_labels, average="macro", zero_division=0),
            "roc_auc": roc_auc_score(y_true, probs),
            "mcc": matthews_corrcoef(y_true, pred_labels),
        }, pred_labels, probs

    def _evaluate_regression(self, model, loader):
        from sklearn.metrics import mean_squared_error, mean_absolute_error

        preds = self._predict(model, loader)
        y_true = np.concatenate([y.numpy() for _, y in loader])

        da = np.mean(np.sign(preds) == np.sign(y_true))
        mask = np.abs(y_true) > 1e-8
        mape = np.mean(np.abs((y_true[mask] - preds[mask]) / y_true[mask])) if mask.sum() > 0 else float("nan")

        return {
            "rmse": float(np.sqrt(mean_squared_error(y_true, preds))),
            "mae": float(mean_absolute_error(y_true, preds)),
            "mape": float(mape),
            "directional_accuracy": float(da),
        }, preds

    # ── Full Pipeline ────────────────────────────────────────────

    def train_and_evaluate(self, ticker: str) -> dict:
        set_seeds(self.seed)
        splits, feature_cols = self._load_data(ticker)
        n_features = len(feature_cols)
        results = {"ticker": ticker, "model": "PatchTST"}

        n_params_info = f"patch_len={self.patch_len}, stride={self.stride}, " \
                        f"d_model={self.d_model}, layers={self.n_layers}, heads={self.n_heads}"

        # ── Classification ───────────────────────────────────────
        logger.info(f"\n{'='*50}")
        logger.info(f"PatchTST CLASSIFICATION — {ticker}")
        logger.info(f"  {n_params_info}")
        logger.info(f"{'='*50}")

        train_ld, val_ld, test_ld = self._create_dataloaders(splits, feature_cols, "Target_Direction")

        clf_model = PatchTST(
            n_features=n_features, seq_len=self.seq_len,
            patch_len=self.patch_len, stride=self.stride,
            d_model=self.d_model, n_heads=self.n_heads,
            n_layers=self.n_layers, d_ff=self.d_ff,
            dropout=self.dropout, task="classification",
        )
        n_params = sum(p.numel() for p in clf_model.parameters())
        logger.info(f"  Parameters: {n_params / 1e3:.1f}K")

        clf_model, clf_history = self._train_model(
            clf_model, train_ld, val_ld, nn.BCEWithLogitsLoss(), "classification"
        )

        clf_val, _, _ = self._evaluate_classification(clf_model, val_ld)
        clf_test, pred_labels, pred_probs = self._evaluate_classification(clf_model, test_ld)
        results["clf_val_metrics"] = clf_val
        results["clf_test_metrics"] = clf_test
        results["clf_history"] = clf_history
        logger.info(f"Val:  {clf_val}")
        logger.info(f"Test: {clf_test}")

        # ── Regression ───────────────────────────────────────────
        logger.info(f"\n{'='*50}")
        logger.info(f"PatchTST REGRESSION — {ticker}")
        logger.info(f"{'='*50}")

        train_r, val_r, test_r = self._create_dataloaders(splits, feature_cols, "Target_LogReturn")

        reg_model = PatchTST(
            n_features=n_features, seq_len=self.seq_len,
            patch_len=self.patch_len, stride=self.stride,
            d_model=self.d_model, n_heads=self.n_heads,
            n_layers=self.n_layers, d_ff=self.d_ff,
            dropout=self.dropout, task="regression",
        )

        reg_model, reg_history = self._train_model(
            reg_model, train_r, val_r, nn.MSELoss(), "regression"
        )

        reg_val, _ = self._evaluate_regression(reg_model, val_r)
        reg_test, reg_preds = self._evaluate_regression(reg_model, test_r)
        results["reg_val_metrics"] = reg_val
        results["reg_test_metrics"] = reg_test
        results["reg_history"] = reg_history
        logger.info(f"Val:  {reg_val}")
        logger.info(f"Test: {reg_test}")

        # ── Predictions DataFrame ────────────────────────────────
        test_ds = PatchTSTDataset(splits["test"], feature_cols, "Target_Direction", self.seq_len)
        test_ds_r = PatchTSTDataset(splits["test"], feature_cols, "Target_LogReturn", self.seq_len)

        pred_df = pd.DataFrame({
            "Target_Direction": test_ds.y,
            "Target_LogReturn": test_ds_r.y,
            "pred_direction": pred_labels,
            "pred_prob_up": pred_probs,
            "pred_log_return": reg_preds,
        }, index=test_ds.dates)
        results["predictions"] = pred_df
        results["n_parameters"] = n_params

        # ── Extract Attention (first batch) ──────────────────────
        try:
            clf_model.eval()
            sample_batch = next(iter(test_ld))[0][:8].to(self.device)
            attn_weights = clf_model.get_attention_weights(sample_batch)
            results["attention_weights"] = [w.numpy() for w in attn_weights]
            logger.info(f"Extracted attention from {len(attn_weights)} layers")
        except Exception as e:
            logger.warning(f"Could not extract attention: {e}")
            results["attention_weights"] = []

        # ── Save ─────────────────────────────────────────────────
        self._save_artifacts(ticker, clf_model, reg_model, results)
        return results

    def train_all(self, tickers: list = PRIMARY_TICKERS) -> Dict[str, dict]:
        all_results = {}
        for ticker in tickers:
            try:
                all_results[ticker] = self.train_and_evaluate(ticker)
            except Exception as e:
                logger.error(f"Failed for {ticker}: {e}")
                import traceback
                traceback.print_exc()
        return all_results

    def _save_artifacts(self, ticker, clf_model, reg_model, results):
        ticker_dir = self.models_dir / ticker
        ticker_dir.mkdir(parents=True, exist_ok=True)

        torch.save(clf_model.state_dict(), ticker_dir / "clf_model.pt")
        torch.save(reg_model.state_dict(), ticker_dir / "reg_model.pt")

        metrics = {
            "ticker": ticker,
            "clf_val": results["clf_val_metrics"],
            "clf_test": results["clf_test_metrics"],
            "reg_val": results["reg_val_metrics"],
            "reg_test": results["reg_test_metrics"],
            "n_parameters": results["n_parameters"],
        }
        with open(self.results_dir / f"{ticker}_metrics.json", "w") as f:
            json.dump(metrics, f, indent=2, default=str)

        for task in ["clf", "reg"]:
            pd.DataFrame(results[f"{task}_history"]).to_csv(
                self.results_dir / f"{ticker}_{task}_history.csv", index=False
            )

        results["predictions"].to_parquet(self.results_dir / f"{ticker}_predictions.parquet")

        if results.get("attention_weights"):
            for i, w in enumerate(results["attention_weights"]):
                np.save(self.results_dir / f"{ticker}_attention_layer{i}.npy", w)

        logger.info(f"Saved all PatchTST artifacts for {ticker}")


# ═══════════════════════════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════════════════════════

def aggregate_patchtst_results(results: Dict[str, dict]) -> pd.DataFrame:
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
    trainer = PatchTSTTrainer(epochs=50)
    results = trainer.train_all()
    summary = aggregate_patchtst_results(results)
    print("\n" + "=" * 90)
    print("PatchTST RESULTS SUMMARY (Test Set)")
    print("=" * 90)
    print(summary.to_string(index=False, float_format="%.4f"))
