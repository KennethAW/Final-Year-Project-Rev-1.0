"""
XGBoost Model
==============
Implements XGBoost for both classification (next-day direction) and
regression (next-day log return) tasks with Optuna hyperparameter tuning.
"""

import logging
import json
import pickle
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
import pandas as pd
import xgboost as xgb
import optuna
from sklearn.metrics import (
    accuracy_score, f1_score, precision_score, recall_score,
    roc_auc_score, matthews_corrcoef,
    mean_squared_error, mean_absolute_error,
)

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from configs.config import (
    PRIMARY_TICKERS, FEATURES_DIR, MODELS_DIR, RESULTS_DIR,
    XGBOOST_N_TRIALS, RANDOM_SEED,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")

# Suppress Optuna info logs
optuna.logging.set_verbosity(optuna.logging.WARNING)


class XGBoostTrainer:
    """
    XGBoost trainer with Optuna-based hyperparameter optimisation.
    Trains separate models for classification and regression tasks.
    """

    def __init__(
        self,
        n_trials: int = XGBOOST_N_TRIALS,
        seed: int = RANDOM_SEED,
        features_dir: Path = FEATURES_DIR,
        models_dir: Path = MODELS_DIR,
        results_dir: Path = RESULTS_DIR,
    ):
        self.n_trials = n_trials
        self.seed = seed
        self.features_dir = features_dir
        self.models_dir = models_dir / "xgboost"
        self.results_dir = results_dir / "xgboost"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.results_dir.mkdir(parents=True, exist_ok=True)

    # ── Data Loading ─────────────────────────────────────────────

    def _load_data(self, ticker: str) -> Tuple[dict, list]:
        """Load train/val/test splits and extract feature columns."""
        splits = {}
        for split in ["train", "val", "test"]:
            path = self.features_dir / f"{ticker}_{split}.parquet"
            splits[split] = pd.read_parquet(path)

        exclude = {"Open", "High", "Low", "Close", "Volume", "Ticker",
                    "Target_Direction", "Target_LogReturn"}
        feature_cols = [c for c in splits["train"].columns if c not in exclude]

        return splits, feature_cols

    def _get_xy(
        self, df: pd.DataFrame, feature_cols: list, target: str
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Extract X (features) and y (target) arrays."""
        X = df[feature_cols].values.astype(np.float32)
        y = df[target].values.astype(np.float32)
        return X, y

    # ── Optuna Hyperparameter Tuning ─────────────────────────────

    def _create_clf_objective(
        self, X_train, y_train, X_val, y_val
    ):
        """Create Optuna objective for classification."""
        def objective(trial):
            params = {
                "objective": "binary:logistic",
                "eval_metric": "logloss",
                "tree_method": "hist",
                "random_state": self.seed,
                "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
                "max_depth": trial.suggest_int("max_depth", 3, 10),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
                "gamma": trial.suggest_float("gamma", 0, 5),
                "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
                "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            }

            model = xgb.XGBClassifier(**params, verbosity=0)
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )

            y_pred = model.predict(X_val)
            return f1_score(y_val, y_pred, average="macro")

        return objective

    def _create_reg_objective(
        self, X_train, y_train, X_val, y_val
    ):
        """Create Optuna objective for regression."""
        def objective(trial):
            params = {
                "objective": "reg:squarederror",
                "eval_metric": "rmse",
                "tree_method": "hist",
                "random_state": self.seed,
                "n_estimators": trial.suggest_int("n_estimators", 100, 1000),
                "max_depth": trial.suggest_int("max_depth", 3, 10),
                "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
                "subsample": trial.suggest_float("subsample", 0.6, 1.0),
                "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
                "min_child_weight": trial.suggest_int("min_child_weight", 1, 10),
                "gamma": trial.suggest_float("gamma", 0, 5),
                "reg_alpha": trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
                "reg_lambda": trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            }

            model = xgb.XGBRegressor(**params, verbosity=0)
            model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )

            y_pred = model.predict(X_val)
            rmse = np.sqrt(mean_squared_error(y_val, y_pred))
            return rmse

        return objective

    def tune_and_train(
        self, ticker: str, task: str = "classification"
    ) -> Tuple[object, dict]:
        """
        Run Optuna HPO and train final model with best params.

        Parameters:
            ticker: Stock ticker
            task: 'classification' or 'regression'

        Returns:
            (trained model, best_params dict)
        """
        splits, feature_cols = self._load_data(ticker)
        target = "Target_Direction" if task == "classification" else "Target_LogReturn"

        X_train, y_train = self._get_xy(splits["train"], feature_cols, target)
        X_val, y_val = self._get_xy(splits["val"], feature_cols, target)

        logger.info(f"Tuning XGBoost ({task}) for {ticker} — {self.n_trials} trials")

        if task == "classification":
            study = optuna.create_study(
                direction="maximize",
                sampler=optuna.samplers.TPESampler(seed=self.seed),
            )
            objective = self._create_clf_objective(X_train, y_train, X_val, y_val)
        else:
            study = optuna.create_study(
                direction="minimize",
                sampler=optuna.samplers.TPESampler(seed=self.seed),
            )
            objective = self._create_reg_objective(X_train, y_train, X_val, y_val)

        study.optimize(objective, n_trials=self.n_trials, show_progress_bar=False)

        best_params = study.best_params
        logger.info(f"Best trial value: {study.best_value:.6f}")
        logger.info(f"Best params: {best_params}")

        if task == "classification":
            best_params.update({
                "objective": "binary:logistic",
                "eval_metric": "logloss",
                "tree_method": "hist",
                "random_state": self.seed,
            })
            model = xgb.XGBClassifier(**best_params, verbosity=0)
        else:
            best_params.update({
                "objective": "reg:squarederror",
                "eval_metric": "rmse",
                "tree_method": "hist",
                "random_state": self.seed,
            })
            model = xgb.XGBRegressor(**best_params, verbosity=0)

        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        return model, best_params

    # ── Evaluation ───────────────────────────────────────────────

    def evaluate_classification(
        self, model, X: np.ndarray, y: np.ndarray
    ) -> dict:
        """Compute classification metrics."""
        y_pred = model.predict(X)
        y_prob = model.predict_proba(X)[:, 1]

        return {
            "accuracy": accuracy_score(y, y_pred),
            "f1_macro": f1_score(y, y_pred, average="macro"),
            "precision": precision_score(y, y_pred, average="macro"),
            "recall": recall_score(y, y_pred, average="macro"),
            "roc_auc": roc_auc_score(y, y_prob),
            "mcc": matthews_corrcoef(y, y_pred),
        }

    def evaluate_regression(
        self, model, X: np.ndarray, y: np.ndarray
    ) -> dict:
        """Compute regression metrics."""
        y_pred = model.predict(X)

        da = np.mean(np.sign(y_pred) == np.sign(y))

        mask = np.abs(y) > 1e-8
        if mask.sum() > 0:
            mape = np.mean(np.abs((y[mask] - y_pred[mask]) / y[mask]))
        else:
            mape = float("nan")

        return {
            "rmse": np.sqrt(mean_squared_error(y, y_pred)),
            "mae": mean_absolute_error(y, y_pred),
            "mape": mape,
            "directional_accuracy": da,
        }

    # ── Full Train & Evaluate Pipeline ───────────────────────────

    def train_and_evaluate(self, ticker: str) -> dict:
        """
        Full pipeline: tune, train, evaluate on test set, save artifacts.

        Returns dict with models, params, and metrics for both tasks.
        """
        splits, feature_cols = self._load_data(ticker)
        X_test_clf, y_test_clf = self._get_xy(splits["test"], feature_cols, "Target_Direction")
        X_test_reg, y_test_reg = self._get_xy(splits["test"], feature_cols, "Target_LogReturn")
        X_val_clf, y_val_clf = self._get_xy(splits["val"], feature_cols, "Target_Direction")
        X_val_reg, y_val_reg = self._get_xy(splits["val"], feature_cols, "Target_LogReturn")

        results = {"ticker": ticker, "model": "XGBoost"}

        # ── Classification ───────────────────────────────────────
        logger.info(f"\n{'='*50}")
        logger.info(f"XGBoost CLASSIFICATION — {ticker}")
        logger.info(f"{'='*50}")

        clf_model, clf_params = self.tune_and_train(ticker, "classification")

        results["clf_params"] = clf_params
        results["clf_val_metrics"] = self.evaluate_classification(clf_model, X_val_clf, y_val_clf)
        results["clf_test_metrics"] = self.evaluate_classification(clf_model, X_test_clf, y_test_clf)

        logger.info(f"Val  metrics: {results['clf_val_metrics']}")
        logger.info(f"Test metrics: {results['clf_test_metrics']}")

        # ── Regression ───────────────────────────────────────────
        logger.info(f"\n{'='*50}")
        logger.info(f"XGBoost REGRESSION — {ticker}")
        logger.info(f"{'='*50}")

        reg_model, reg_params = self.tune_and_train(ticker, "regression")

        results["reg_params"] = reg_params
        results["reg_val_metrics"] = self.evaluate_regression(reg_model, X_val_reg, y_val_reg)
        results["reg_test_metrics"] = self.evaluate_regression(reg_model, X_test_reg, y_test_reg)

        logger.info(f"Val  metrics: {results['reg_val_metrics']}")
        logger.info(f"Test metrics: {results['reg_test_metrics']}")

        # ── Feature Importance ───────────────────────────────────
        importance = clf_model.feature_importances_
        importance_df = pd.DataFrame({
            "feature": feature_cols,
            "importance": importance,
        }).sort_values("importance", ascending=False)
        results["feature_importance"] = importance_df

        # ── Save Predictions (for backtesting) ───────────────────
        test_df = splits["test"].copy()
        test_df["pred_direction"] = clf_model.predict(X_test_clf)
        test_df["pred_prob_up"] = clf_model.predict_proba(X_test_clf)[:, 1]
        test_df["pred_log_return"] = reg_model.predict(X_test_reg)
        results["predictions"] = test_df

        # ── Save Artifacts ───────────────────────────────────────
        self._save_artifacts(ticker, clf_model, reg_model, clf_params, reg_params,
                            results, importance_df, test_df)

        return results

    def train_all(self, tickers: list = PRIMARY_TICKERS) -> Dict[str, dict]:
        """Train and evaluate XGBoost for all tickers."""
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

    def _save_artifacts(
        self, ticker, clf_model, reg_model, clf_params, reg_params,
        results, importance_df, predictions_df,
    ):
        """Save models, params, metrics, and predictions."""
        ticker_dir = self.models_dir / ticker
        ticker_dir.mkdir(parents=True, exist_ok=True)

        # Save models
        clf_model.save_model(str(ticker_dir / "clf_model.json"))
        reg_model.save_model(str(ticker_dir / "reg_model.json"))

        # Save hyperparameters
        with open(ticker_dir / "clf_params.json", "w") as f:
            json.dump(clf_params, f, indent=2)
        with open(ticker_dir / "reg_params.json", "w") as f:
            json.dump(reg_params, f, indent=2)

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

        # Save feature importance
        importance_df.to_csv(self.results_dir / f"{ticker}_feature_importance.csv", index=False)

        # Save predictions for backtesting
        predictions_df.to_parquet(self.results_dir / f"{ticker}_predictions.parquet")

        logger.info(f"Saved all artifacts for {ticker}")


# ── Results Aggregation ──────────────────────────────────────────

def aggregate_xgboost_results(results: Dict[str, dict]) -> pd.DataFrame:
    """
    Combine results across tickers into a single summary table.
    Suitable for inclusion in the thesis.
    """
    rows = []
    for ticker, res in results.items():
        row = {"Ticker": ticker}
        # Classification
        for k, v in res["clf_test_metrics"].items():
            row[f"Clf_{k}"] = v
        # Regression
        for k, v in res["reg_test_metrics"].items():
            row[f"Reg_{k}"] = v
        rows.append(row)

    df = pd.DataFrame(rows)

    # Add mean row
    mean_row = {"Ticker": "MEAN"}
    for col in df.columns:
        if col != "Ticker":
            mean_row[col] = df[col].mean()
    df = pd.concat([df, pd.DataFrame([mean_row])], ignore_index=True)

    return df


if __name__ == "__main__":
    trainer = XGBoostTrainer(n_trials=50)  # Reduce for quick test
    results = trainer.train_all()

    # Print summary
    summary = aggregate_xgboost_results(results)
    print("\n" + "=" * 80)
    print("XGBOOST RESULTS SUMMARY (Test Set)")
    print("=" * 80)
    print(summary.to_string(index=False, float_format="%.4f"))
