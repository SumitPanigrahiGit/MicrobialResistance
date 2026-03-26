"""
NeuralRx — Application Configuration
"""

from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    # API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "sk-your-key-here")

    # Paths
    BASE_DIR: Path = Path(__file__).parent
    MODEL_PATH: Path = BASE_DIR / "models" / "amr_classifier.pkl"
    FAISS_INDEX_PATH: Path = BASE_DIR / "data" / "faiss_index"
    DATA_DIR: Path = BASE_DIR / "data"

    # Model
    MODEL_THRESHOLD: float = 0.5
    TOP_K_DOCS: int = 5

    # LLM
    LLM_MODEL: str = "gpt-3.5-turbo"
    LLM_MAX_TOKENS: int = 600
    LLM_TEMPERATURE: float = 0.2

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
