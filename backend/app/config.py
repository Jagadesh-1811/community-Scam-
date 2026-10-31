import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Search for .env in current directory or backend directory
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Built-in fallback public key for demonstration/evaluation
DEFAULT_PUBLIC_KEY = "2dea54f6666e54ab09e2676e0f19698c95ba3932aaae5ead68e5aeeeebd79597"

class Settings(BaseModel):
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///scamradar.db")
    HMAC_SECRET_KEY: str = os.getenv("HMAC_SECRET_KEY", "scamradar-super-secret-hmac-key-2026")
    LICENSE_PUBLIC_KEY: str = os.getenv("LICENSE_PUBLIC_KEY", DEFAULT_PUBLIC_KEY)
    ENABLE_ADMIN_RESET: bool = os.getenv("ENABLE_ADMIN_RESET", "true").lower() in ("true", "1", "yes")
    BURST_WINDOW_HOURS: int = int(os.getenv("BURST_WINDOW_HOURS", "2"))
    MAX_REPORTS_PER_REPORTER_HOUR: int = int(os.getenv("MAX_REPORTS_PER_REPORTER_HOUR", "30"))
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://psvmzqigzpvzbggrmhvw.supabase.co")
    SUPABASE_PUBLISHABLE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
    SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "")

settings = Settings()
