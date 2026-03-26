"""
NeuralRx — Train AMR Model
Run this once before starting the API server:
    python train.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

import pandas as pd
import logging
from services.ml_model import train_model, generate_synthetic_amr_data
from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_real_data() -> pd.DataFrame | None:
    """
    Attempt to load the real Mendeley AMR dataset.
    Expects a CSV named 'amr_dataset.csv' in the data/ directory.
    Download from: https://data.mendeley.com/datasets/ccmrx8n7mk/1
    """
    csv_path = settings.DATA_DIR / "amr_dataset.csv"
    if csv_path.exists():
        logger.info(f"Loading real dataset from {csv_path}")
        df = pd.read_csv(csv_path)
        logger.info(f"Loaded {len(df)} rows, columns: {list(df.columns)}")
        return df
    return None


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("  NeuralRx — AMR Model Training")
    logger.info("=" * 60)

    # Try real data first, fall back to synthetic
    df = load_real_data()
    if df is None:
        logger.info("Real dataset not found — generating synthetic training data.")
        df = generate_synthetic_amr_data(n_samples=5000)

    bundle = train_model(df=df, model_path=settings.MODEL_PATH)

    m = bundle["metrics"]
    logger.info("")
    logger.info("✅ Training complete!")
    logger.info(f"   Accuracy : {m['accuracy']:.4f}")
    logger.info(f"   ROC-AUC  : {m['roc_auc']:.4f}")
    logger.info(f"   Model saved to: {settings.MODEL_PATH}")
    logger.info("")
    logger.info("Top 5 features:")
    for feat, imp in bundle["top_features"][:5]:
        logger.info(f"   {feat:30s} {imp:.4f}")
