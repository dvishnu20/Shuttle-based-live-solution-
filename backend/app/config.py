from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusMove AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DATABASE_URL: str = "sqlite:///./campusmove.db"
    
    # Thresholds as specified in SRS
    STALE_GPS_THRESHOLD_SECONDS: int = 30
    DEFAULT_DWELL_SECONDS: int = 20
    MAX_CROWD_AVAILABLE_PCT: int = 50      # < 50%
    MAX_CROWD_FILLING_PCT: int = 75        # 50 - 74%
    MAX_CROWD_NEARLY_FULL_PCT: int = 100   # 75 - 99%, 100% is Full
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()

