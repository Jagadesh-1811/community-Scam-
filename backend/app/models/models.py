import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, PrimaryKeyConstraint, Index, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(String(64), primary_key=True)
    case_id = Column(String(32), index=True, nullable=False)
    occurred_at = Column(DateTime, nullable=False)
    reported_at = Column(DateTime, nullable=False)
    reporter_hash = Column(String(64), index=True, nullable=False)
    ip_hash = Column(String(64), index=True, nullable=False)
    channel = Column(String(32), nullable=False)
    scam_type = Column(String(64), nullable=False)
    identifier_type = Column(String(32), nullable=False)
    identifier_value = Column(String(255), nullable=False)
    pincode = Column(String(10), nullable=False)
    locality = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    note_scrubbed = Column(Text, nullable=True)
    note_fingerprint = Column(String(128), nullable=True)
    has_screenshot = Column(Boolean, default=False)
    amount_lost_inr = Column(Float, nullable=True)
    weight = Column(Float, default=0.3)
    person_group = Column(String(64), nullable=True)
    ignored = Column(Boolean, default=False)
    merged = Column(Boolean, default=False)

    __table_args__ = (
        Index("ix_reports_ident_occurred", "identifier_type", "identifier_value", "occurred_at"),
        Index("ix_reports_pincode_occurred", "pincode", "occurred_at"),
        Index("ix_reports_reporter_ident", "reporter_hash", "identifier_type", "identifier_value"),
    )


class IdentifierSummary(Base):
    __tablename__ = "identifier_summary"

    identifier_type = Column(String(32), primary_key=True)
    identifier_value = Column(String(255), primary_key=True)
    report_count = Column(Integer, default=0)
    distinct_reporters = Column(Integer, default=0)
    effective_score = Column(Float, default=0.0)
    first_seen = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    top_scam_type = Column(String(64), nullable=True)
    challenged = Column(Boolean, default=False)
    verdict = Column(String(32), default="NO_REPORTS")

    __table_args__ = (
        PrimaryKeyConstraint("identifier_type", "identifier_value"),
    )


class Reporter(Base):
    __tablename__ = "reporters"

    reporter_hash = Column(String(64), primary_key=True)
    first_seen = Column(DateTime, nullable=False)
    confirmed_count = Column(Integer, default=0)
    disproved_count = Column(Integer, default=0)
    last_reported_at = Column(DateTime, nullable=False)


class Area(Base):
    __tablename__ = "areas"

    pincode = Column(String(10), primary_key=True)
    locality = Column(String(100), nullable=False)
    city = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)


class VerifiedIdentifier(Base):
    __tablename__ = "verified_identifiers"

    identifier_type = Column(String(32), primary_key=True)
    identifier_value = Column(String(255), primary_key=True)
    owner = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)

    __table_args__ = (
        PrimaryKeyConstraint("identifier_type", "identifier_value"),
    )


class Challenge(Base):
    __tablename__ = "challenges"

    challenge_id = Column(String(64), primary_key=True)
    identifier_type = Column(String(32), nullable=False)
    identifier_value = Column(String(255), nullable=False)
    claimant_name = Column(String(200), nullable=False)
    contact_email = Column(String(200), nullable=False)
    proof_note = Column(Text, nullable=False)
    status = Column(String(32), default="under_review")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    decided_at = Column(DateTime, nullable=True)
    decision_note = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_challenges_ident", "identifier_type", "identifier_value"),
        Index("ix_challenges_status", "status"),
    )


class LicenseState(Base):
    __tablename__ = "license_state"

    id = Column(Integer, primary_key=True, default=1)
    license_json = Column(Text, nullable=False)
    licensee = Column(String(200), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    last_seen_time = Column(DateTime, nullable=False)
    signature = Column(String(255), nullable=False)
    status = Column(String(32), default="valid")

