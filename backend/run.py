"""
ScamRadar India — Backend Entry Point
Run with: python run.py
Passes server_header=False to suppress uvicorn server fingerprinting.
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        server_header=False,   # Suppress "server: uvicorn" fingerprinting header
        date_header=False,     # Suppress "date" header (reduces info leakage)
    )

