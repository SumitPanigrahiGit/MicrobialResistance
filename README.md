# 🧬 NeuralRx — RAG-Based Antibiotic Resistance Predictor

> HackElevate'26 | Team NeuralRx | Healthcare & AI Theme

---

## Overview

**NeuralRx** predicts antibiotic resistance in bacterial strains by combining:
- **ML Classifier** — XGBoost + Random Forest ensemble trained on AMR tabular data
- **RAG Engine** — FAISS vector store + LangChain + GPT for clinical plain-English explanations
- **Interactive Dashboard** — React + Vite frontend with biopunk dark UI

---

## Project Structure

```
neuralrx/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # App settings (Pydantic)
│   ├── train.py             # Model training script
│   ├── requirements.txt
│   ├── routers/
│   │   ├── prediction.py    # POST /predict/resistance
│   │   ├── rag.py           # POST /rag/explain
│   │   └── analytics.py     # GET  /analytics/*
│   ├── services/
│   │   ├── ml_model.py      # XGBoost + RF ensemble
│   │   └── rag_service.py   # FAISS + LangChain + OpenAI
│   └── data/
│       └── amr_dataset.csv  # (place real dataset here)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        └── App.jsx          # Full React UI
```

---

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# (Optional) Place real dataset from Mendeley:
# https://data.mendeley.com/datasets/ccmrx8n7mk/1
# Save as: data/amr_dataset.csv

# Train the model (uses synthetic data if no real dataset found)
python train.py

# Set OpenAI key for LLM explanations (optional — falls back to templates)
export OPENAI_API_KEY=sk-your-key-here

# Start the API server
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev   # → http://localhost:3000
```

### 3. API Docs

Visit `http://localhost:8000/docs` for interactive Swagger UI.

---

## API Endpoints

| Method | Path                              | Description                               |
|--------|-----------------------------------|-------------------------------------------|
| POST   | `/api/v1/predict/resistance`      | Single sample resistance prediction       |
| POST   | `/api/v1/predict/batch`           | Batch prediction (up to 50 samples)       |
| GET    | `/api/v1/predict/model-info`      | Model metrics + available species/drugs   |
| POST   | `/api/v1/rag/explain`             | RAG-powered clinical explanation          |
| GET    | `/api/v1/rag/gene/{name}`         | Gene-specific clinical knowledge          |
| GET    | `/api/v1/rag/documents`           | List knowledge base documents             |
| GET    | `/api/v1/analytics/resistance-map`| Species × antibiotic resistance heatmap   |
| GET    | `/api/v1/analytics/gene-frequency`| Gene detection frequency with trends      |
| GET    | `/api/v1/analytics/antibiotic-efficacy` | Efficacy by antibiotic class        |

### Example Request

```bash
curl -X POST http://localhost:8000/api/v1/predict/resistance \
  -H "Content-Type: application/json" \
  -d '{
    "species": "Staphylococcus aureus",
    "antibiotic": "Penicillin",
    "resistance_genes": ["mecA"],
    "mic_value": 4.0,
    "gram_positive": true,
    "hospital_acquired": true
  }'
```

### Example Response

```json
{
  "resistant": true,
  "probability": 0.8924,
  "confidence": "HIGH",
  "xgb_probability": 0.8812,
  "rf_probability": 0.9036,
  "active_genes": ["mecA"],
  "species": "Staphylococcus aureus",
  "antibiotic": "Penicillin"
}
```

---

## Datasets

| Source    | Dataset                                        | Link |
|-----------|------------------------------------------------|------|
| Mendeley  | Antimicrobial Resistance Dataset               | [🔗](https://data.mendeley.com/datasets/ccmrx8n7mk/1) |
| Kaggle    | Multi-Resistance Antibiotic Susceptibility     | [🔗](https://www.kaggle.com/datasets/adilimadeddinehosni/multi-resistance-antibiotic-susceptibility) |

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| ML          | XGBoost, Scikit-learn (RF)        |
| RAG         | LangChain, FAISS, OpenAI GPT      |
| Backend     | FastAPI, Pydantic, Uvicorn        |
| Frontend    | React 18, Vite, Space Mono font   |
| Data        | Pandas, NumPy                     |
| Viz         | Canvas API (DNA animation)        |

---

## Team — NeuralRx

| Role          | Name                  |
|---------------|-----------------------|
| Team Leader   | [Name]                |
| Member 2      | [Name]                |
| Member 3      | [Name]                |

---

*HackElevate'26 by Novus Solutions*
