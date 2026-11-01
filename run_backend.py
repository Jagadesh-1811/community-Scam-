"""
ScamRadar India — Root Backend Launcher
Run directly from root directory:
    python run_backend.py
"""
import sys
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.chdir(BACKEND_DIR)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        app_dir=str(BACKEND_DIR),
        server_header=False,
        date_header=False,
    )
