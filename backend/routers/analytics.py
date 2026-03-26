"""
NeuralRx — Analytics Router
GET /api/v1/analytics/resistance-map
GET /api/v1/analytics/gene-frequency
GET /api/v1/analytics/antibiotic-efficacy
"""

from fastapi import APIRouter
from typing import Dict, List
import random

router = APIRouter()


def _seed_random(seed: int = 42):
    random.seed(seed)


@router.get("/resistance-map")
async def resistance_map():
    """
    Returns simulated resistance rates per antibiotic across bacterial species.
    Replace with real aggregated prediction logs in production.
    """
    _seed_random()
    from services.ml_model import ANTIBIOTIC_CLASSES, BACTERIAL_SPECIES

    data = []
    for species in BACTERIAL_SPECIES[:8]:
        for antibiotic in ANTIBIOTIC_CLASSES[:10]:
            rate = round(random.uniform(0.05, 0.95), 2)
            data.append({
                "species":    species,
                "antibiotic": antibiotic,
                "resistance_rate": rate,
                "sample_count": random.randint(20, 500),
            })
    return {"data": data}


@router.get("/gene-frequency")
async def gene_frequency():
    """Returns simulated gene detection frequency across recent samples."""
    _seed_random(7)
    from services.ml_model import RESISTANCE_GENES

    return {
        "genes": [
            {"gene": g, "frequency": round(random.uniform(0.01, 0.65), 3),
             "trend": random.choice(["rising", "stable", "declining"])}
            for g in RESISTANCE_GENES
        ]
    }


@router.get("/antibiotic-efficacy")
async def antibiotic_efficacy():
    """Returns simulated efficacy scores per antibiotic class."""
    _seed_random(13)
    from services.ml_model import ANTIBIOTIC_CLASSES

    classes = {
        "Beta-lactams":    ["Penicillin","Ampicillin","Amoxicillin","Cefazolin","Ceftriaxone"],
        "Carbapenems":     ["Meropenem","Imipenem"],
        "Fluoroquinolones":["Ciprofloxacin","Levofloxacin"],
        "Macrolides":      ["Erythromycin","Azithromycin"],
        "Glycopeptides":   ["Vancomycin"],
        "Aminoglycosides": ["Gentamicin","Tobramycin"],
        "Tetracyclines":   ["Tetracycline","Doxycycline"],
        "Oxazolidinones":  ["Linezolid"],
        "Rifamycins":      ["Rifampin"],
        "Lincosamides":    ["Clindamycin"],
    }

    result = []
    for cls, antibiotics in classes.items():
        efficacy = round(random.uniform(0.3, 0.95), 2)
        result.append({
            "class": cls,
            "antibiotics": antibiotics,
            "efficacy_score": efficacy,
            "resistance_rate": round(1 - efficacy + random.uniform(-0.1, 0.1), 2),
        })
    return {"classes": result}
