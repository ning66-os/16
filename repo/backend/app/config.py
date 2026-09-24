from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./fire_investigation.db"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    PYANNOTE_AUTH_TOKEN: Optional[str] = None
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    FROM_EMAIL: str = "fire-investigation@example.com"
    APP_URL: str = "http://localhost:3000"
    MAX_AUDIO_SIZE: int = 104857600

    class Config:
        env_file = ".env"


settings = Settings()
