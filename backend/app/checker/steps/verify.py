import asyncio
from typing import List
from sqlalchemy import select, and_

from app.checker.state import CheckState, ExtractedIdentifier, LinkFinding
from app.checker.rules.links import link_scanner
from app.database import AsyncSessionLocal
from app.models.models import IdentifierSummary, VerifiedIdentifier
from app.services.privacy import mask_display_value

async def verify_identifier_in_db(ident: ExtractedIdentifier) -> ExtractedIdentifier:
    """Performs direct database lookup on precomputed summary and verified list (no HTTP)."""
    norm_type = ident.type.lower()
    norm_val = ident.value

    async with AsyncSessionLocal() as session:
        # 1. Check verified list first
        ver_stmt = select(VerifiedIdentifier).where(
            and_(
                VerifiedIdentifier.identifier_type == norm_type,
                VerifiedIdentifier.identifier_value == norm_val
            )
        )
        res_ver = await session.execute(ver_stmt)
        verified = res_ver.scalars().first()
        if verified:
            ident.verdict = "VERIFIED_BUSINESS"
            ident.report_count = 0
            ident.distinct_reporters = 0
            ident.display_value = norm_val
            ident.is_verified = True
            ident.verified_name = verified.owner
            return ident

        # 2. Check summary table
        sum_stmt = select(IdentifierSummary).where(
            and_(
                IdentifierSummary.identifier_type == norm_type,
                IdentifierSummary.identifier_value == norm_val
            )
        )
        res_sum = await session.execute(sum_stmt)
        summary = res_sum.scalars().first()

        if summary:
            ident.verdict = summary.verdict
            ident.report_count = summary.report_count
            ident.distinct_reporters = summary.distinct_reporters
            ident.display_value = mask_display_value(norm_type, norm_val, summary.distinct_reporters)
        else:
            ident.verdict = "NO_REPORTS"
            ident.report_count = 0
            ident.distinct_reporters = 0
            ident.display_value = mask_display_value(norm_type, norm_val, 0)

    return ident

async def step_verify(state: CheckState) -> CheckState:
    """
    Step 2: Verification
    Runs community lookup and link scanning concurrently using asyncio.gather.
    """
    tasks = []

    # Branch A: Community lookups
    for ident in state.identifiers:
        tasks.append(verify_identifier_in_db(ident))

    # Branch B: Link scanning
    for link_item in state.links:
        tasks.append(link_scanner.scan_link(link_item.url))

    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)

        idx_ident = len(state.identifiers)
        ident_results = results[:idx_ident]
        link_results = results[idx_ident:]

        # Update identifiers
        updated_idents = []
        for orig, res in zip(state.identifiers, ident_results):
            if isinstance(res, ExtractedIdentifier):
                updated_idents.append(res)
            else:
                updated_idents.append(orig)
        state.identifiers = updated_idents

        # Update links
        updated_links = []
        for orig, res in zip(state.links, link_results):
            if isinstance(res, LinkFinding):
                updated_links.append(res)
            else:
                updated_links.append(orig)
        state.links = updated_links

    return state

