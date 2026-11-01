"""
ScamRadar India — Backend Entry Point
Run from ANY directory:
    python backend/run.py
    python run.py
Passes server_header=False to suppress uvicorn server fingerprinting.
Ensures sys.path includes the backend folder so multiprocessing child workers can find 'app'.
"""
import sys
import os
from pathlib import Path

# Add backend directory to sys.path so 'app' is always discoverable by child processes
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure current working directory is backend for relative sqlite paths
os.chdir(BACKEND_DIR)

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        app_dir=str(BACKEND_DIR),
        server_header=False,   # Suppress "server: uvicorn" fingerprinting header
        date_header=False,     # Suppress "date" header (reduces info leakage)
    )
