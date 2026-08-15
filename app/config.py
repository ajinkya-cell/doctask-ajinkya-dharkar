import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "SuperDocs DAO Treasury Analyst"
    DEBUG: bool = True
    
    # Database URL
    DATABASE_URL: str = "sqlite+aiosqlite:///./dao_analyst.db"
    
    # LLM Settings
    USE_MOCK_LLM: bool = False
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    
    # NVIDIA NIM Settings
    NVIDIA_API_KEY: str = ""
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "meta/llama-3.3-70b-instruct"
    
    # Paths
    WATCH_DIR: str = "./watched"
    SEED_DIR: str = "./seed_data"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
