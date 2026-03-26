"""
NeuralRx — RAG (Retrieval-Augmented Generation) Service
Combines FAISS vector search with an LLM to generate clinical
plain-English explanations of antibiotic resistance.
"""

import logging
import json
from pathlib import Path
from typing import List, Dict, Optional

import numpy as np

logger = logging.getLogger(__name__)

# ── AMR Knowledge Base ────────────────────────────────────────────────────────
# Curated documents covering key AMR genes, mechanisms, and clinical guidance.
# In production, replace/augment with PubMed articles and WHONET exports.

AMR_KNOWLEDGE_BASE = [
    {
        "id": "doc_001",
        "title": "mecA Gene — MRSA Resistance Mechanism",
        "content": (
            "The mecA gene encodes a penicillin-binding protein (PBP2a) with low affinity "
            "for beta-lactam antibiotics, conferring resistance to all penicillins, "
            "cephalosporins, and carbapenems in Staphylococcus aureus (MRSA). "
            "Treatment alternatives include vancomycin, linezolid, and daptomycin. "
            "mecA is typically carried on the Staphylococcal Cassette Chromosome mec (SCCmec)."
        ),
        "genes": ["mecA"],
        "antibiotics": ["Penicillin", "Ampicillin", "Cefazolin", "Meropenem"],
        "organisms": ["Staphylococcus aureus"],
    },
    {
        "id": "doc_002",
        "title": "blaNDM — New Delhi Metallo-beta-lactamase",
        "content": (
            "blaNDM encodes a metallo-beta-lactamase that hydrolyses nearly all "
            "beta-lactam antibiotics, including carbapenems. It is commonly found in "
            "Klebsiella pneumoniae, Escherichia coli, and Acinetobacter baumannii. "
            "Colistin and tigecycline remain among the last-resort treatment options. "
            "blaNDM is often co-located with other resistance genes on mobile genetic elements."
        ),
        "genes": ["blaNDM"],
        "antibiotics": ["Meropenem", "Imipenem", "Ceftriaxone", "Ampicillin"],
        "organisms": ["Klebsiella pneumoniae", "Escherichia coli", "Acinetobacter baumannii"],
    },
    {
        "id": "doc_003",
        "title": "vanA/vanB — Vancomycin-Resistant Enterococci (VRE)",
        "content": (
            "vanA and vanB operons reprogramme cell-wall precursor synthesis, replacing "
            "D-Ala-D-Ala with D-Ala-D-Lac (vanA) or D-Ala-D-Ser (vanB), reducing "
            "vancomycin binding affinity by 1000-fold. VRE infections are treated with "
            "linezolid, daptomycin, or quinupristin/dalfopristin. "
            "vanA confers high-level resistance while vanB produces variable MICs."
        ),
        "genes": ["vanA", "vanB"],
        "antibiotics": ["Vancomycin"],
        "organisms": ["Enterococcus faecium", "Enterococcus faecalis"],
    },
    {
        "id": "doc_004",
        "title": "blaCTX-M — Extended-Spectrum Beta-Lactamases (ESBL)",
        "content": (
            "blaCTX-M genes encode extended-spectrum beta-lactamases (ESBLs) that hydrolyse "
            "penicillins and extended-spectrum cephalosporins. CTX-M-15 is the predominant "
            "variant globally. ESBL producers are resistant to cephalosporins and "
            "penicillins; carbapenems (meropenem, imipenem) remain the gold standard "
            "treatment. Antibiotic stewardship programs are critical to limit further spread."
        ),
        "genes": ["blaCTX-M"],
        "antibiotics": ["Ceftriaxone", "Ampicillin", "Ciprofloxacin"],
        "organisms": ["Escherichia coli", "Klebsiella pneumoniae"],
    },
    {
        "id": "doc_005",
        "title": "blaKPC — Klebsiella pneumoniae Carbapenemase",
        "content": (
            "blaKPC encodes a serine carbapenemase that confers resistance to all "
            "beta-lactams including carbapenems and monobactams. KPC-producing organisms "
            "are considered extremely drug-resistant (XDR). Treatment options include "
            "ceftazidime-avibactam, meropenem-vaborbactam, and colistin-based combinations. "
            "The KPC gene is typically located on highly transmissible IncFII plasmids."
        ),
        "genes": ["blaKPC"],
        "antibiotics": ["Meropenem", "Imipenem", "Ceftriaxone"],
        "organisms": ["Klebsiella pneumoniae", "Enterobacter cloacae"],
    },
    {
        "id": "doc_006",
        "title": "mcr-1 — Colistin Resistance Gene",
        "content": (
            "mcr-1 encodes a phosphoethanolamine transferase that modifies lipid A in the "
            "outer membrane, reducing colistin binding. Its emergence on transmissible "
            "plasmids represents a critical threat as colistin is a last-resort antibiotic "
            "for carbapenem-resistant Gram-negative infections. "
            "Combination therapy with rifampin or fosfomycin may retain some efficacy."
        ),
        "genes": ["mcr-1"],
        "antibiotics": ["Colistin"],
        "organisms": ["Escherichia coli", "Klebsiella pneumoniae", "Salmonella typhi"],
    },
    {
        "id": "doc_007",
        "title": "ermB/ermC — Macrolide Resistance via Ribosomal Methylation",
        "content": (
            "ermB and ermC encode rRNA methyltransferases that methylate the 23S rRNA, "
            "preventing macrolide, lincosamide, and streptogramin B (MLSB) binding. "
            "ermB is prevalent in Streptococcus pneumoniae and Enterococcus; "
            "ermC predominates in Staphylococcus. Alternative treatment includes "
            "fluoroquinolones, tetracyclines, or linezolid depending on the organism."
        ),
        "genes": ["ermB", "ermC"],
        "antibiotics": ["Erythromycin", "Azithromycin", "Clindamycin"],
        "organisms": ["Staphylococcus aureus", "Streptococcus pneumoniae", "Enterococcus faecium"],
    },
    {
        "id": "doc_008",
        "title": "tetM/tetA — Tetracycline Resistance Mechanisms",
        "content": (
            "tetM encodes a ribosomal protection protein (RPP) that displaces tetracycline "
            "from the ribosome via GTP hydrolysis. tetA encodes an efflux pump expelling "
            "tetracycline from the cell. Both mechanisms are widely distributed across "
            "Gram-positive and Gram-negative organisms. Tigecycline and eravacycline "
            "overcome most tet-mediated resistance as they are poor substrates for efflux."
        ),
        "genes": ["tetM", "tetA"],
        "antibiotics": ["Tetracycline", "Doxycycline"],
        "organisms": ["Staphylococcus aureus", "Escherichia coli", "Helicobacter pylori"],
    },
    {
        "id": "doc_009",
        "title": "WHO ESKAPE Pathogens — Priority List",
        "content": (
            "The WHO ESKAPE pathogens (Enterococcus faecium, Staphylococcus aureus, "
            "Klebsiella pneumoniae, Acinetobacter baumannii, Pseudomonas aeruginosa, "
            "Enterobacter spp.) represent the leading cause of nosocomial infections "
            "worldwide. Carbapenem-resistant Acinetobacter baumannii is classified as "
            "Critical Priority 1 by WHO. Rapid diagnostics and de-escalation therapy "
            "are cornerstone strategies in antimicrobial stewardship programs."
        ),
        "genes": [],
        "antibiotics": [],
        "organisms": ["Acinetobacter baumannii", "Pseudomonas aeruginosa", "Klebsiella pneumoniae"],
    },
    {
        "id": "doc_010",
        "title": "aac6 — Aminoglycoside Acetyltransferase Resistance",
        "content": (
            "aac(6') genes encode aminoglycoside acetyltransferases that chemically modify "
            "aminoglycosides (gentamicin, tobramycin, amikacin), preventing their binding "
            "to the 30S ribosomal subunit. aac(6')-Ib-cr additionally modifies "
            "fluoroquinolones. Plazomicin is a next-generation aminoglycoside designed to "
            "evade most aminoglycoside-modifying enzymes."
        ),
        "genes": ["aac6"],
        "antibiotics": ["Gentamicin", "Tobramycin"],
        "organisms": ["Klebsiella pneumoniae", "Escherichia coli", "Pseudomonas aeruginosa"],
    },
]


# ── Simple In-Memory Vector Store ─────────────────────────────────────────────
# Production replacement: use FAISS or ChromaDB with real embeddings.

class SimpleVectorStore:
    """
    Lightweight TF-IDF based retrieval for demo purposes.
    Replace with FAISS + OpenAI embeddings for production.
    """

    def __init__(self, documents: List[Dict]):
        self.docs = documents
        self._build_index()

    def _build_index(self):
        """Build a simple word-overlap index."""
        self._doc_words = []
        for doc in self.docs:
            words = set(
                (doc["content"] + " " + doc["title"] + " " +
                 " ".join(doc["genes"]) + " " + " ".join(doc["antibiotics"])).lower().split()
            )
            self._doc_words.append(words)

    def search(self, query: str, k: int = 3) -> List[Dict]:
        """Return top-k documents by word overlap with query."""
        query_words = set(query.lower().split())
        scores = [len(query_words & dw) for dw in self._doc_words]
        top_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
        return [self.docs[i] for i in top_idx if scores[i] > 0]


# Singleton store
_vector_store: Optional[SimpleVectorStore] = None


def get_vector_store() -> SimpleVectorStore:
    global _vector_store
    if _vector_store is None:
        _vector_store = SimpleVectorStore(AMR_KNOWLEDGE_BASE)
        logger.info(f"Vector store initialised with {len(AMR_KNOWLEDGE_BASE)} documents.")
    return _vector_store


# ── LLM Explanation Generator ─────────────────────────────────────────────────

def build_rag_prompt(
    species: str,
    antibiotic: str,
    prediction: Dict,
    retrieved_docs: List[Dict],
) -> str:
    """Construct the RAG prompt for the LLM."""
    docs_text = "\n\n".join(
        f"[{d['title']}]\n{d['content']}" for d in retrieved_docs
    )
    resistance_label = "RESISTANT" if prediction["resistant"] else "SUSCEPTIBLE"
    genes = ", ".join(prediction.get("active_genes", [])) or "None detected"

    return f"""You are a clinical microbiologist AI assistant.
A bacterial isolate has been tested for antibiotic resistance.

PREDICTION RESULT:
- Organism      : {species}
- Antibiotic    : {antibiotic}
- Outcome       : {resistance_label}
- Probability   : {prediction['probability']:.1%}
- Resistance genes detected: {genes}

RETRIEVED CLINICAL KNOWLEDGE:
{docs_text}

Based on the above, provide:
1. A plain-English explanation (2-3 sentences) of WHY this organism is {resistance_label.lower()} to {antibiotic}.
2. The key molecular mechanism(s) driving resistance (if resistant).
3. Two to three alternative antibiotic recommendations with brief rationale.
4. A single actionable clinical note for the treating physician.

Be precise, cite specific genes, keep language clear for a non-specialist clinician."""


async def generate_rag_explanation(
    species: str,
    antibiotic: str,
    prediction: Dict,
    openai_api_key: str,
    llm_model: str = "gpt-3.5-turbo",
) -> Dict:
    """
    Retrieve relevant documents and generate a clinical explanation.
    Falls back to template-based explanation if OpenAI is unavailable.
    """
    store = get_vector_store()
    query = f"{species} {antibiotic} resistance " + " ".join(prediction.get("active_genes", []))
    retrieved = store.search(query, k=3)

    # Try OpenAI — gracefully fall back if key not set
    explanation = None
    if openai_api_key and openai_api_key != "sk-your-key-here":
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_api_key)
            prompt = build_rag_prompt(species, antibiotic, prediction, retrieved)
            response = await client.chat.completions.create(
                model=llm_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.2,
            )
            explanation = response.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenAI call failed: {e} — using template fallback.")

    if explanation is None:
        explanation = _template_explanation(species, antibiotic, prediction, retrieved)

    return {
        "explanation":     explanation,
        "retrieved_docs":  [{"title": d["title"], "id": d["id"]} for d in retrieved],
        "query_used":      query,
    }


def _template_explanation(
    species: str,
    antibiotic: str,
    prediction: Dict,
    docs: List[Dict],
) -> str:
    """Template-based fallback explanation when LLM is unavailable."""
    label = "RESISTANT" if prediction["resistant"] else "SUSCEPTIBLE"
    prob  = prediction["probability"]
    genes = prediction.get("active_genes", [])

    lines = [
        f"**Prediction**: {species} is predicted to be **{label}** to {antibiotic} "
        f"(probability: {prob:.1%}).",
        "",
    ]
    if genes:
        lines += [
            f"**Resistance genes detected**: {', '.join(genes)}",
            "",
            "**Mechanism**: The detected genes encode proteins that inactivate or "
            "bypass the antibiotic's target, reducing its clinical efficacy.",
            "",
        ]
    else:
        lines += [
            "**No canonical resistance genes detected** in this isolate. "
            "Resistance may be driven by chromosomal mutations or intrinsic mechanisms.",
            "",
        ]

    if docs:
        lines += [
            "**Clinical background** (from retrieved literature):",
            docs[0]["content"][:300] + "...",
            "",
        ]

    lines += [
        "**Recommendations**: Please consult local antibiogram data and "
        "clinical guidelines (CLSI / EUCAST) for definitive antibiotic selection. "
        "Consider infectious disease specialist consultation for complex cases.",
    ]
    return "\n".join(lines)


# ── Gene Lookup ───────────────────────────────────────────────────────────────

def get_gene_info(gene: str) -> Optional[Dict]:
    """Return knowledge-base entries mentioning a specific gene."""
    store = get_vector_store()
    results = store.search(gene, k=3)
    gene_docs = [d for d in results if gene.lower() in
                 [g.lower() for g in d.get("genes", [])]]
    return gene_docs if gene_docs else results[:2]
