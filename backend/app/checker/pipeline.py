import time
import asyncio
import json
from typing import AsyncGenerator, Dict, Any
from app.checker.state import CheckState, TraceStep
from app.checker.steps import (
    step_intake,
    step_verify,
    step_score,
    step_classify_and_explain,
    step_advise
)

STEP_TIMEOUT_SECONDS = 3.0

async def execute_step_with_trace(step_name: str, step_coro, state: CheckState) -> CheckState:
    t0 = time.time()
    status = "completed"
    try:
        state = await asyncio.wait_for(step_coro(state), timeout=STEP_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        status = "timeout_fallback"
    except Exception:
        status = "error_fallback"

    duration_ms = int((time.time() - t0) * 1000)
    # Log trace: status and duration only, NO sensitive content
    state.trace.append(TraceStep(step=step_name, status=status, duration_ms=duration_ms))
    return state

async def run_checker(state: CheckState) -> CheckState:
    """Runs the 5 deterministic steps in sequence."""
    # Step 1: Intake
    state = await execute_step_with_trace("intake", step_intake, state)
    if not state.usable:
        return state

    # Step 2: Verify (Lookup + Link Scan)
    if state.identifiers or state.links:
        state = await execute_step_with_trace("verify", step_verify, state)

    # Step 3: Score
    state = await execute_step_with_trace("score", step_score, state)

    # Step 4: Classify & Explain
    state = await execute_step_with_trace("classify_explain", step_classify_and_explain, state)

    # Step 5: Advise
    state = await execute_step_with_trace("advise", step_advise, state)

    return state

async def run_checker_stream(state: CheckState) -> AsyncGenerator[Dict[str, Any], None]:
    """Runs the 5 deterministic steps, yielding SSE events after each step and final result."""
    steps = [
        ("intake", step_intake, True),
        ("verify", step_verify, False),
        ("score", step_score, False),
        ("classify_explain", step_classify_and_explain, False),
        ("advise", step_advise, False)
    ]

    for step_name, step_fn, is_mandatory in steps:
        # Conditional verify execution
        if step_name == "verify" and not (state.identifiers or state.links):
            continue

        state = await execute_step_with_trace(step_name, step_fn, state)

        # Yield step trace event (no content)
        last_trace = state.trace[-1]
        yield {
            "event": "step",
            "data": json.dumps({
                "step": last_trace.step,
                "status": last_trace.status,
                "duration_ms": last_trace.duration_ms
            })
        }

        # Check early exit if unusable
        if step_name == "intake" and not state.usable:
            break

    # Yield final result event
    yield {
        "event": "result",
        "data": json.dumps(state.to_result_dict())
    }

