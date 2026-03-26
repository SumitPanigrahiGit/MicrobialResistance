"""
NeuralRx — ML Model Service
Trains and serves an XGBoost/Random Forest classifier
for antibiotic resistance prediction.
"""

import numpy as np
import pandas as pd
import joblib
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (classification_report, roc_auc_score,
                              confusion_matrix, accuracy_score)
from sklearn.pipeline import Pipeline
import xgboost as xgb

logger = logging.getLogger(__name__)


# ── Feature Definitions ───────────────────────────────────────────────────────

ANTIBIOTIC_CLASSES = [
    "Penicillin", "Ampicillin", "Amoxicillin", "Ciprofloxacin",
    "Levofloxacin", "Erythromycin", "Azithromycin", "Tetracycline",
    "Doxycycline", "Vancomycin", "Cefazolin", "Ceftriaxone",
    "Meropenem", "Imipenem", "Gentamicin", "Tobramycin",
    "Trimethoprim", "Clindamycin", "Linezolid", "Rifampin",
]

BACTERIAL_SPECIES = [
    "Staphylococcus aureus", "Escherichia coli", "Klebsiella pneumoniae",
    "Pseudomonas aeruginosa", "Acinetobacter baumannii", "Enterococcus faecium",
    "Streptococcus pneumoniae", "Salmonella typhi", "Mycobacterium tuberculosis",
    "Helicobacter pylori", "Neisseria gonorrhoeae", "Enterobacter cloacae",
]

RESISTANCE_GENES = [
    "mecA", "vanA", "vanB", "blaTEM", "blaSHV", "blaCTX-M",
    "blaKPC", "blaNDM", "blaOXA-48", "mcr-1", "tetM", "tetA",
    "aac6", "ermB", "ermC", "cfr", "optrA", "fosA", "qnrA", "sul1",
]


# ── Data Generation (for demo when real dataset unavailable) ──────────────────

def generate_synthetic_amr_data(n_samples: int = 2000, seed: int = 42) -> pd.DataFrame:
    """
    Generate synthetic AMR dataset for training when the real Mendeley
    dataset is unavailable. Mirrors the feature structure of the real data.
    """
    rng = np.random.default_rng(seed)

    data = {
        # Bacterial metadata
        "species_id":       rng.integers(0, len(BACTERIAL_SPECIES), n_samples),
        "gram_positive":    rng.integers(0, 2, n_samples),
        "biofilm_forming":  rng.integers(0, 2, n_samples),
        "virulence_score":  rng.uniform(0, 10, n_samples).round(2),

        # Resistance genes (binary presence)
        **{f"gene_{g.replace('-','_')}": rng.integers(0, 2, n_samples)
           for g in RESISTANCE_GENES},

        # MIC (Minimum Inhibitory Concentration) values — log scale
        "mic_value":        rng.exponential(scale=2.0, size=n_samples).round(3),

        # Clinical context
        "hospital_acquired": rng.integers(0, 2, n_samples),
        "immune_compromised": rng.integers(0, 2, n_samples),
        "prior_antibiotic":   rng.integers(0, 2, n_samples),

        # Target antibiotic
        "antibiotic_id": rng.integers(0, len(ANTIBIOTIC_CLASSES), n_samples),
    }

    df = pd.DataFrame(data)

    # Realistic label generation — correlated with gene presence
    gene_cols = [c for c in df.columns if c.startswith("gene_")]
    gene_sum = df[gene_cols].sum(axis=1)
    logit = (
        -2.0
        + 0.4 * gene_sum
        + 0.5 * df["hospital_acquired"]
        + 0.3 * df["prior_antibiotic"]
        + 0.2 * df["virulence_score"]
        + 0.6 * np.log1p(df["mic_value"])
    )
    prob_resistant = 1 / (1 + np.exp(-logit))
    df["resistant"] = (rng.uniform(size=n_samples) < prob_resistant).astype(int)

    logger.info(f"Generated {n_samples} synthetic samples. "
                f"Resistance rate: {df['resistant'].mean():.1%}")
    return df


# ── Model Training ─────────────────────────────────────────────────────────────

def train_model(df: Optional[pd.DataFrame] = None,
                model_path: Optional[Path] = None) -> Dict:
    """
    Train the AMR classifier.
    Returns: dict with model, metrics, and feature importances.
    """
    if df is None:
        logger.info("No dataset provided — using synthetic data for demo.")
        df = generate_synthetic_amr_data()

    feature_cols = [c for c in df.columns if c != "resistant"]
    X = df[feature_cols].values
    y = df["resistant"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Ensemble: XGBoost + Random Forest
    xgb_model = xgb.XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8, use_label_encoder=False,
        eval_metric="logloss", random_state=42, n_jobs=-1,
    )
    rf_model = RandomForestClassifier(
        n_estimators=200, max_depth=10, min_samples_split=5,
        random_state=42, n_jobs=-1,
    )

    logger.info("Training XGBoost classifier...")
    xgb_model.fit(X_train, y_train)
    logger.info("Training Random Forest classifier...")
    rf_model.fit(X_train, y_train)

    # Ensemble prediction (soft voting)
    xgb_proba = xgb_model.predict_proba(X_test)[:, 1]
    rf_proba  = rf_model.predict_proba(X_test)[:, 1]
    ensemble_proba = (xgb_proba + rf_proba) / 2
    ensemble_pred  = (ensemble_proba >= 0.5).astype(int)

    metrics = {
        "accuracy":  float(accuracy_score(y_test, ensemble_pred)),
        "roc_auc":   float(roc_auc_score(y_test, ensemble_proba)),
        "report":    classification_report(y_test, ensemble_pred, output_dict=True),
        "confusion_matrix": confusion_matrix(y_test, ensemble_pred).tolist(),
    }
    logger.info(f"Model metrics — Accuracy: {metrics['accuracy']:.3f}, "
                f"ROC-AUC: {metrics['roc_auc']:.3f}")

    # Feature importances
    feat_imp = {
        col: float(imp)
        for col, imp in zip(feature_cols, xgb_model.feature_importances_)
    }
    top_features = sorted(feat_imp.items(), key=lambda x: x[1], reverse=True)[:10]

    bundle = {
        "xgb_model":   xgb_model,
        "rf_model":    rf_model,
        "feature_cols": feature_cols,
        "metrics":     metrics,
        "top_features": top_features,
    }

    if model_path:
        model_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(bundle, model_path)
        logger.info(f"Model saved to {model_path}")

    return bundle


# ── Inference ─────────────────────────────────────────────────────────────────

class AMRPredictor:
    """Inference wrapper for the trained AMR classifier."""

    def __init__(self, model_path: Path):
        self._bundle = None
        self._model_path = model_path

    def _load(self):
        if self._bundle is None:
            if self._model_path.exists():
                logger.info(f"Loading model from {self._model_path}")
                self._bundle = joblib.load(self._model_path)
            else:
                logger.warning("Model file not found — training fresh model.")
                self._bundle = train_model(model_path=self._model_path)

    def predict(self, features: Dict) -> Dict:
        """
        Predict resistance for a single sample.

        Args:
            features: dict mapping feature names → values

        Returns:
            dict with prediction, probability, confidence_band, top_genes
        """
        self._load()
        bundle = self._bundle
        feat_vec = np.array([features.get(c, 0) for c in bundle["feature_cols"]]).reshape(1, -1)

        xgb_p = bundle["xgb_model"].predict_proba(feat_vec)[0, 1]
        rf_p  = bundle["rf_model"].predict_proba(feat_vec)[0, 1]
        prob  = float((xgb_p + rf_p) / 2)

        # Confidence band
        if prob >= 0.75:
            confidence = "HIGH"
        elif prob >= 0.50:
            confidence = "MODERATE"
        else:
            confidence = "LOW"

        # Active resistance genes in sample
        active_genes = [
            g for g in RESISTANCE_GENES
            if features.get(f"gene_{g.replace('-','_')}", 0) == 1
        ]

        return {
            "resistant":       prob >= 0.5,
            "probability":     round(prob, 4),
            "confidence":      confidence,
            "xgb_probability": round(float(xgb_p), 4),
            "rf_probability":  round(float(rf_p), 4),
            "active_genes":    active_genes,
            "top_features":    bundle["top_features"],
        }

    def batch_predict(self, samples: List[Dict]) -> List[Dict]:
        """Predict for a batch of samples."""
        return [self.predict(s) for s in samples]

    def get_model_metrics(self) -> Dict:
        self._load()
        return self._bundle.get("metrics", {})


# Singleton instance — lazy loaded
_predictor_instance: Optional[AMRPredictor] = None


def get_predictor(model_path: Path) -> AMRPredictor:
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = AMRPredictor(model_path)
    return _predictor_instance
