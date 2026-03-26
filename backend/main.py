"""
NeuralRx - RAG-Based Antibiotic Resistance Predictor
FastAPI Backend — Main Application Entry Point
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from contextlib import asynccontextmanager

from routers import prediction, rag, analytics
from config import settings
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    logger.info("🧬 NeuralRx API starting up...")
    logger.info(f"   Model path : {settings.MODEL_PATH}")
    logger.info(f"   Vector DB  : {settings.FAISS_INDEX_PATH}")
    yield
    logger.info("🔴 NeuralRx API shutting down...")


app = FastAPI(
    title="NeuralRx API",
    description="RAG-Based Antibiotic Resistance Predictor",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(prediction.router, prefix="/api/v1/predict",  tags=["Prediction"])
app.include_router(rag.router,        prefix="/api/v1/rag",       tags=["RAG Insights"])
app.include_router(analytics.router,  prefix="/api/v1/analytics", tags=["Analytics"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "service": "NeuralRx API", "version": "1.0.0"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
