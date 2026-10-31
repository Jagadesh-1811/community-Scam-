import math
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Set, Tuple, Optional
from collections import Counter
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import Report, IdentifierSummary, Reporter, VerifiedIdentifier, Challenge
from app.services.privacy import scrub_note_pii

class UnionFind:
    def __init__(self, elements: List[str]):
        self.parent = {x: x for x in elements}

    def find(self, x: str) -> str:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: str, y: str):
        root_x = self.find(x)
        root_y = self.find(y)
        if root_x != root_y:
            self.parent[root_y] = root_x

    def get_groups(self) -> Dict[str, List[str]]:
        groups = {}
        for x in self.parent:
            root = self.find(x)
            if root not in groups:
                groups[root] = []
            groups[root].append(x)
        return groups

def get_char_3grams(text: str) -> Set[str]:
    cleaned = re.sub(r"\s+", " ", text.lower().strip())
    if len(cleaned) < 3:
        return {cleaned} if cleaned else set()
    return {cleaned[i:i+3] for i in range(len(cleaned) - 2)}

def jaccard_similarity(set_a: Set[str], set_b: Set[str]) -> float:
    if not set_a or not set_b:
        return 0.0
    inter = len(set_a & set_b)
    union = len(set_a | set_b)
    return inter / union if union > 0 else 0.0

def calculate_shannon_entropy(items: List[str]) -> float:
    n = len(items)
    if n <= 1:
        return 1.0
    counts = Counter(items)
    h = -sum((c / n) * math.log2(c / n) for c in counts.values())
    max_h = math.log2(n)
    return h / max_h if max_h > 0 else 0.0

class TrustEngine:
    async def get_or_create_reporter_weight(self, session: AsyncSession, reporter_hash: str) -> float:
        stmt = select(Reporter).where(Reporter.reporter_hash == reporter_hash)
        res = await session.execute(stmt)
        reporter = res.scalars().first()

        now = datetime.utcnow()
        if not reporter:
            reporter = Reporter(
                reporter_hash=reporter_hash,
                first_seen=now,
                confirmed_count=0,
                disproved_count=0,
                last_reported_at=now
            )
            session.add(reporter)
            return 0.3  # Baseline for new accounts

        reporter.last_reported_at = now
        total_eval = reporter.confirmed_count + reporter.disproved_count
        if total_eval == 0:
            age_days = (now - reporter.first_seen).total_seconds() / 86400
            return 1.0 if age_days >= 2 else 0.3

        ratio = (reporter.confirmed_count + 1) / (reporter.confirmed_count + reporter.disproved_count + 2)
        weight = 0.2 + (1.3 * ratio)
        return min(max(weight, 0.2), 1.5)

    def calculate_note_multiplier(self, note: str) -> float:
        if not note or len(note.strip()) < 15:
            return 0.6
        if len(note.strip()) > 60:
            return 1.2
        return 1.0

    async def evaluate_and_save_report(
        self,
        session: AsyncSession,
        report_data: dict,
        reporter_hash: str,
        ip_hash: str
    ) -> Tuple[Report, IdentifierSummary, bool]:
        ident_type = report_data["identifier_type"]
        ident_val = report_data["identifier_value"]
        occurred_at = report_data.get("occurred_at") or datetime.utcnow()
        reported_at = report_data.get("reported_at") or datetime.utcnow()

        # Check if same reporter already reported this exact identifier
        existing_rep_stmt = select(Report).where(
            and_(
                Report.reporter_hash == reporter_hash,
                Report.identifier_type == ident_type,
                Report.identifier_value == ident_val
            )
        )
        res_existing = await session.execute(existing_rep_stmt)
        existing_report = res_existing.scalars().first()

        merged = False
        if existing_report:
            existing_report.occurred_at = max(existing_report.occurred_at, occurred_at)
            existing_report.reported_at = max(existing_report.reported_at, reported_at)
            existing_report.merged = True
            report_record = existing_report
            merged = True
        else:
            reporter_weight = await self.get_or_create_reporter_weight(session, reporter_hash)
            raw_note = report_data.get("note", "") or ""
            scrubbed_note = scrub_note_pii(raw_note)
            note_mult = self.calculate_note_multiplier(scrubbed_note)
            final_weight = round(reporter_weight * note_mult, 3)

            report_record = Report(
                report_id=report_data["report_id"],
                case_id=report_data["case_id"],
                occurred_at=occurred_at,
                reported_at=reported_at,
                reporter_hash=reporter_hash,
                ip_hash=ip_hash,
                channel=report_data["channel"],
                scam_type=report_data["scam_type"],
                identifier_type=ident_type,
                identifier_value=ident_val,
                pincode=report_data["pincode"],
                locality=report_data.get("locality"),
                city=report_data.get("city"),
                note_scrubbed=scrubbed_note,
                note_fingerprint=scrubbed_note[:100],
                has_screenshot=report_data.get("has_screenshot", False),
                amount_lost_inr=report_data.get("amount_lost_inr", 0.0),
                weight=final_weight,
                ignored=False,
                merged=False
            )
            session.add(report_record)

        await session.flush()

        # Fetch all reports for this identifier
        all_reps_stmt = select(Report).where(
            and_(
                Report.identifier_type == ident_type,
                Report.identifier_value == ident_val
            )
        ).order_by(Report.occurred_at.asc())
        res_all = await session.execute(all_reps_stmt)
        all_reports: List[Report] = list(res_all.scalars().all())

        # Burst guard check
        now = datetime.utcnow()
        def _to_naive_utc(dt):
            if dt is None:
                return now
            if dt.tzinfo is not None:
                return dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt

        recent_reports = [r for r in all_reports if (now - _to_naive_utc(r.occurred_at)).total_seconds() <= 86400]
        
        is_fake_burst = False
        if len(recent_reports) >= 5:
            ip_counts = Counter([r.ip_hash for r in recent_reports])
            most_common_ip, most_common_count = ip_counts.most_common(1)[0]
            ip_entropy = calculate_shannon_entropy([r.ip_hash for r in recent_reports])
            new_acc_ratio = sum(1 for r in recent_reports if r.weight <= 0.36) / len(recent_reports)
            single_ip_dominance = most_common_count / len(recent_reports)

            # Fake wave / coordinated attack detected:
            if single_ip_dominance >= 0.7 or (ip_entropy < 0.35 and new_acc_ratio >= 0.7):
                is_fake_burst = True
                for r in recent_reports:
                    if r.ip_hash == most_common_ip or r.weight <= 0.36:
                        r.ignored = True

        # Union-Find Person Grouping:
        rep_ids = [r.report_id for r in all_reports]
        uf = UnionFind(rep_ids)
        report_ngrams = {r.report_id: get_char_3grams(r.note_scrubbed or "") for r in all_reports}

        for i in range(len(all_reports)):
            for j in range(i + 1, len(all_reports)):
                r1, r2 = all_reports[i], all_reports[j]
                
                # Rule 1: Same reporter
                if r1.reporter_hash == r2.reporter_hash:
                    uf.union(r1.report_id, r2.report_id)
                    continue

                # Rule 2: Same IP prefix within 24h
                time_diff = abs((r1.occurred_at - r2.occurred_at).total_seconds())
                if r1.ip_hash == r2.ip_hash and time_diff <= 86400:
                    uf.union(r1.report_id, r2.report_id)
                    continue

                # Rule 3: Note similarity >= 0.7
                if r1.note_scrubbed and r2.note_scrubbed:
                    sim = jaccard_similarity(report_ngrams[r1.report_id], report_ngrams[r2.report_id])
                    if sim >= 0.7:
                        uf.union(r1.report_id, r2.report_id)

        groups = uf.get_groups()
        rep_by_id = {r.report_id: r for r in all_reports}

        # Distinct reporters is the count of person groups
        distinct_reporters = len(groups) if all_reports else 0

        # Calculate effective score and active members
        effective_score = 0.0
        scam_types = []
        first_seen = None
        last_seen = None

        for root_id, member_ids in groups.items():
            members = [rep_by_id[m_id] for m_id in member_ids]
            active = [m for m in members if not m.ignored]
            for m in members:
                m.person_group = root_id

            if active:
                group_weight = max(m.weight for m in active)
                # If >= 3 independent groups confirm the scam:
                if distinct_reporters >= 3 and not is_fake_burst:
                    note_mult = max(self.calculate_note_multiplier(m.note_scrubbed or "") for m in active)
                    group_weight = max(group_weight, 1.0 * note_mult)
                effective_score += group_weight

                for m in active:
                    scam_types.append(m.scam_type)
                    if first_seen is None or m.occurred_at < first_seen:
                        first_seen = m.occurred_at
                    if last_seen is None or m.occurred_at > last_seen:
                        last_seen = m.occurred_at

        effective_score = round(effective_score, 2)
        top_scam_type = Counter(scam_types).most_common(1)[0][0] if scam_types else (all_reports[0].scam_type if all_reports else None)

        # Check Verified List
        ver_stmt = select(VerifiedIdentifier).where(
            and_(
                VerifiedIdentifier.identifier_type == ident_type,
                VerifiedIdentifier.identifier_value == ident_val
            )
        )
        ver_res = await session.execute(ver_stmt)
        is_verified = ver_res.scalars().first() is not None

        # Check Challenges
        chal_stmt = select(Challenge).where(
            and_(
                Challenge.identifier_type == ident_type,
                Challenge.identifier_value == ident_val,
                Challenge.status == "under_review"
            )
        )
        chal_res = await session.execute(chal_stmt)
        is_challenged = chal_res.scalars().first() is not None

        # Determine Verdict
        if is_verified:
            verdict = "VERIFIED_BUSINESS"
        elif is_challenged:
            verdict = "SUSPICIOUS" if len(all_reports) > 0 else "NO_REPORTS"
        elif distinct_reporters >= 3 and effective_score >= 3.0 and not is_fake_burst:
            verdict = "KNOWN_SCAM"
        elif distinct_reporters > 0 or len(all_reports) > 0:
            verdict = "SUSPICIOUS"
        else:
            verdict = "NO_REPORTS"

        # Update Identifier Summary
        summary_stmt = select(IdentifierSummary).where(
            and_(
                IdentifierSummary.identifier_type == ident_type,
                IdentifierSummary.identifier_value == ident_val
            )
        )
        res_summary = await session.execute(summary_stmt)
        summary = res_summary.scalars().first()

        if not summary:
            summary = IdentifierSummary(
                identifier_type=ident_type,
                identifier_value=ident_val,
                report_count=len(all_reports),
                distinct_reporters=distinct_reporters,
                effective_score=effective_score,
                first_seen=first_seen or occurred_at,
                last_seen=last_seen or occurred_at,
                top_scam_type=top_scam_type,
                challenged=is_challenged,
                verdict=verdict
            )
            session.add(summary)
        else:
            summary.report_count = len(all_reports)
            summary.distinct_reporters = distinct_reporters
            summary.effective_score = effective_score
            summary.first_seen = first_seen or summary.first_seen
            summary.last_seen = last_seen or summary.last_seen
            summary.top_scam_type = top_scam_type
            summary.challenged = is_challenged
            summary.verdict = verdict

        await session.commit()
        return report_record, summary, merged

trust_engine = TrustEngine()
