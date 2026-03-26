"""
NeuralRx — Prediction Router
POST /api/v1/predict/resistance
POST /api/v1/predict/batch
GET  /api/v1/predict/model-info
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import logging

from services.ml_model import get_predictor, ANTIBIOTIC_CLASSES, BACTERIAL_SPECIES, RESISTANCE_GENES
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ResistanceInput(BaseModel):
    species: str = Field(..., example="Staphylococcus aureus",
                         description="Bacterial species name")
    antibiotic: str = Field(..., example="Penicillin",
                            description="Antibiotic to test against")
    resistance_genes: List[str] = Field(
        default=[], example=["mecA"], description="Detected resistance genes"
    )
    mic_value: float = Field(default=0.0, ge=0, description="Minimum Inhibitory Concentration")
    gram_positive: bool = Field(default=True)
    biofilm_forming: bool = Field(default=False)
    virulence_score: float = Field(default=5.0, ge=0, le=10)
    hospital_acquired: bool = Field(default=False)
    immune_compromised: bool = Field(default=False)
    prior_antibiotic: bool = Field(default=False)


class ResistancePrediction(BaseModel):
    resistant: bool
    probability: float
    confidence: str
    xgb_probability: float
    rf_probability: float
    active_genes: List[str]
    top_features: List[List]
    species: str
    antibiotic: str


class BatchInput(BaseModel):
    samples: List[ResistanceInput]


# ── Helpers ───────────────────────────────────────────────────────────────────

def input_to_features(inp: ResistanceInput) -> Dict:
    """Convert API input to the flat feature dict expected by the model."""
    species_id = BACTERIAL_SPECIES.index(inp.species) if inp.species in BACTERIAL_SPECIES else 0
    antibiotic_id = ANTIBIOTIC_CLASSES.index(inp.antibiotic) if inp.antibiotic in ANTIBIOTIC_CLASSES else 0

    features = {
        "species_id":        species_id,
        "gram_positive":     int(inp.gram_positive),
        "biofilm_forming":   int(inp.biofilm_forming),
        "virulence_score":   inp.virulence_score,
        "mic_value":         inp.mic_value,
        "hospital_acquired": int(inp.hospital_acquired),
        "immune_compromised":int(inp.immune_compromised),
        "prior_antibiotic":  int(inp.prior_antibiotic),
        "antibiotic_id":     antibiotic_id,
    }
    # Add gene flags
    for gene in RESISTANCE_GENES:
        key = f"gene_{gene.replace('-', '_')}"
        features[key] = 1 if gene in inp.resistance_genes else 0

    return features


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/resistance", response_model=ResistancePrediction)
async def predict_resistance(inp: ResistanceInput):
    """
    Predict whether a bacterial strain is resistant to a given antibiotic.
    Returns probability, confidence band, and active resistance genes.
    """
    try:
        predictor = get_predictor(settings.MODEL_PATH)
        features  = input_to_features(inp)
        result    = predictor.predict(features)
        return ResistancePrediction(
            species=inp.species,
            antibiotic=inp.antibiotic,
            **result,
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch")
async def predict_batch(batch: BatchInput):
    """Predict resistance for multiple samples at once."""
    if len(batch.samples) > 50:
        raise HTTPException(status_code=400, detail="Batch size limited to 50 samples.")
    try:
        predictor = get_predictor(settings.MODEL_PATH)
        results = []
        for inp in batch.samples:
            features = input_to_features(inp)
            res = predictor.predict(features)
            results.append({**res, "species": inp.species, "antibiotic": inp.antibiotic})
        return {"predictions": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Batch prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-info")
async def model_info():
    """Return model performance metrics and available species/antibiotics."""
    predictor = get_predictor(settings.MODEL_PATH)
    metrics   = predictor.get_model_metrics()
    return {
        "model_type":     "XGBoost + Random Forest Ensemble",
        "metrics":        metrics,
        "species":        BACTERIAL_SPECIES,
        "antibiotics":    ANTIBIOTIC_CLASSES,
        "resistance_genes": RESISTANCE_GENES,
    }
