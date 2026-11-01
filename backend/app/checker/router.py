import asyncio
from typing import Optional
from fastapi import APIRouter, Request, HTTPException, status, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.checker.state import CheckState
from app.checker.pipeline import run_checker, run_checker_stream
from app.services.privacy import hash_with_secret
from app.services.rate_limiter import rate_limiter

router = APIRouter(tags=["Message Checker"])

# Concurrency cap: maximum 5 simultaneous checker executions
CHECKER_SEMAPHORE = asyncio.Semaphore(5)

class CheckJsonPayload(BaseModel):
    text: Optional[str] = ""
    link: Optional[str] = None
    ui_language: Optional[str] = "en"

@router.post("/check")
async def check_message(
    request: Request,
    stream: bool = Query(True, description="Stream step progress via SSE (default True)"),
    # Form / multipart parameters
    text: Optional[str] = Form(None),
    link: Optional[str] = Form(None),
    ui_language: Optional[str] = Form("en"),
    image: Optional[UploadFile] = File(None)
):
    """
    POST /check
    Deterministic, rule-based message and screenshot scam checker.
    Accepts JSON or multipart/form-data.
    Streams SSE step progress events by default, or returns direct JSON with ?stream=false.
    """
    # 1. Rate limiting per hashed IP
    client_ip = request.client.host if request.client else "127.0.0.1"
    ip_hash = hash_with_secret(client_ip)
    if rate_limiter.is_rate_limited("checker_user", ip_hash):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many check requests from this network. Please wait."
        )

    # 2. Parse payload: JSON or Multipart Form
    raw_text = ""
    raw_link = None
    lang = "en"
    image_bytes = None

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            raw_text = body.get("text", "") or ""
            raw_link = body.get("link")
            lang = body.get("ui_language", "en") or "en"
        except Exception:
            raw_text = ""
    else:
        raw_text = text or ""
        raw_link = link
        lang = ui_language or "en"
        if image:
            image_bytes = await image.read()

    # 3. Validate: at least one of text or link must be provided
    if not raw_text.strip() and not raw_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text or link provided. Please paste a message or URL to analyze."
        )

    # 4. Initialize CheckState in memory
    state = CheckState(
        raw_text=raw_text,
        raw_link=raw_link,
        raw_image_bytes=image_bytes,
        ui_language=lang
    )

    # 5. Handle non-streaming mode (for tests or simple clients)
    if not stream:
        async with CHECKER_SEMAPHORE:
            state = await run_checker(state)
            if not state.usable:
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": state.error_message or "No readable text detected."}
                )
            return JSONResponse(content=state.to_result_dict())

    # 6. Handle SSE streaming mode
    async def event_generator():
        async with CHECKER_SEMAPHORE:
            async for sse_event in run_checker_stream(state):
                yield sse_event

    return EventSourceResponse(event_generator())

