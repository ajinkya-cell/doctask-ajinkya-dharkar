import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "SuperDocs Talent Auditor"
    DEBUG: bool = True
    
    # Database URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./talent_auditor.db"
    
    # NVIDIA NIM API Settings (Primary AI Inference Engine)
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_MODEL: str = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")
    
    # Auto-detect whether to use live NVIDIA NIM or deterministic fallback
    USE_MOCK_LLM: bool = not (
        bool(os.getenv("NVIDIA_API_KEY", "").strip())
        and os.getenv("NVIDIA_API_KEY", "").strip() != "your_nvidia_api_key_here"
        and os.getenv("NVIDIA_API_KEY", "").strip().startswith("nvapi-")
    )
    
    # Paths
    WATCH_DIR: str = "./watched"
    SEED_DIR: str = "./seed_data"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
