"""
NeuralRx — RAG Router
POST /api/v1/rag/explain
GET  /api/v1/rag/gene/{gene_name}
GET  /api/v1/rag/documents
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import logging

from services.rag_service import generate_rag_explanation, get_gene_info, AMR_KNOWLEDGE_BASE
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class ExplainRequest(BaseModel):
    species:   str = Field(..., example="Staphylococcus aureus")
    antibiotic: str = Field(..., example="Penicillin")
    prediction: Dict = Field(..., description="Prediction result dict from /predict/resistance")


@router.post("/explain")
async def explain_resistance(req: ExplainRequest):
    """
    Use the RAG pipeline to generate a plain-English clinical explanation
    for the resistance prediction, backed by retrieved literature.
    """
    try:
        result = await generate_rag_explanation(
            species=req.species,
            antibiotic=req.antibiotic,
            prediction=req.prediction,
            openai_api_key=settings.OPENAI_API_KEY,
            llm_model=settings.LLM_MODEL,
        )
        return result
    except Exception as e:
        logger.error(f"RAG explain error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gene/{gene_name}")
async def gene_info(gene_name: str):
    """Return clinical information about a specific resistance gene."""
    docs = get_gene_info(gene_name)
    if not docs:
        raise HTTPException(status_code=404, detail=f"No info found for gene: {gene_name}")
    return {"gene": gene_name, "documents": docs}


@router.get("/documents")
async def list_documents():
    """List all documents in the knowledge base."""
    return {
        "count": len(AMR_KNOWLEDGE_BASE),
        "documents": [
            {"id": d["id"], "title": d["title"], "genes": d["genes"],
             "organisms": d["organisms"], "antibiotics": d["antibiotics"]}
            for d in AMR_KNOWLEDGE_BASE
        ],
    }
