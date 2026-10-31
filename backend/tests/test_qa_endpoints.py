import os
import sys
import json
import asyncio
from datetime import datetime
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from app.database import init_db, AsyncSessionLocal
from app.services.license_service import license_service
from app.services.rate_limiter import rate_limiter

@pytest_asyncio.fixture(scope="function", autouse=True)
async def ensure_qa_environment():
    await init_db()
    rate_limiter.reset()
    # Load long license
    lic_path = os.path.join(os.path.dirname(__file__), "..", "licenses", "license_long.json")
    if os.path.exists(lic_path):
        with open(lic_path, "r") as f:
            lic_data = json.load(f)
        async with AsyncSessionLocal() as session:
            await license_service.save_to_db(session, lic_data)
    yield

@pytest_asyncio.fixture
async def qa_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

# 1. QA for GET /health
@pytest.mark.asyncio
async def test_qa_health(qa_client: AsyncClient):
    res = await qa_client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}

# 2. QA for POST /reports
@pytest.mark.asyncio
async def test_qa_reports_valid(qa_client: AsyncClient):
    payload = {
        "reporter_id": "qa_reporter_01",
        "ip_prefix": "106.51.10.0",
        "channel": "phone_call",
        "scam_type": "digital-arrest",
        "identifier_type": "phone",
        "identifier_value": "+919876500111",
        "pincode": "560102",
        "locality": "HSR Layout",
        "city": "Bengaluru",
        "note": "Caller claimed to be police from cyber crime branch demanding money transfer.",
        "amount_lost_inr": 25000.0
    }
    res = await qa_client.post("/reports", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "report_id" in data
    assert "case_id" in data
    assert data["case_id"].startswith("CASE-")
    assert data["merged"] is False

@pytest.mark.asyncio
async def test_qa_reports_validation_error(qa_client: AsyncClient):
    # Missing required fields -> 400 with error message
    res = await qa_client.post("/reports", json={"invalid": "payload"})
    assert res.status_code == 400
    assert "error" in res.json()

@pytest.mark.asyncio
async def test_qa_reports_junk_identifier(qa_client: AsyncClient):
    payload = {
        "reporter_id": "qa_rep",
        "ip_prefix": "10.0.0.1",
        "channel": "phone_call",
        "scam_type": "other",
        "identifier_type": "phone",
        "identifier_value": "12345",  # Junk phone
        "pincode": "560102"
    }
    res = await qa_client.post("/reports", json=payload)
    assert res.status_code == 400
    assert "error" in res.json()

# 3. QA for GET /lookup
@pytest.mark.asyncio
async def test_qa_lookup_verified_business(qa_client: AsyncClient):
    # Pre-seeded helpline 1930
    res = await qa_client.get("/lookup?type=phone&value=1930")
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "VERIFIED_BUSINESS"
    assert data["display_value"] == "1930"

@pytest.mark.asyncio
async def test_qa_lookup_no_reports(qa_client: AsyncClient):
    # Clean number never reported -> 200 with NO_REPORTS (never 404)
    res = await qa_client.get("/lookup?type=phone&value=+919876599999")
    assert res.status_code == 200
    data = res.json()
    assert data["verdict"] == "NO_REPORTS"
    assert data["report_count"] == 0
    assert "display_value" in data

@pytest.mark.asyncio
async def test_qa_lookup_missing_parameters(qa_client: AsyncClient):
    # Missing parameters -> 400
    res = await qa_client.get("/lookup")
    assert res.status_code == 400
    assert "error" in res.json()

# 4. QA for GET /map
@pytest.mark.asyncio
async def test_qa_map_clusters(qa_client: AsyncClient):
    res = await qa_client.get("/map?days=7&radius_km=5")
    assert res.status_code == 200
    data = res.json()
    assert "clusters" in data
    assert isinstance(data["clusters"], list)

# 5. QA for GET /alerts
@pytest.mark.asyncio
async def test_qa_alerts(qa_client: AsyncClient):
    res = await qa_client.get("/alerts?pincode=560102")
    assert res.status_code == 200
    data = res.json()
    assert "alerts" in data
    assert isinstance(data["alerts"], list)

# 6. QA for POST /challenges (Dispute feature)
@pytest.mark.asyncio
async def test_qa_challenges(qa_client: AsyncClient):
    payload = {
        "identifier_type": "phone",
        "identifier_value": "+918041002233",
        "claimant_name": "Bangalore Cloud Services",
        "contact_email": "legal@cloudserv.in",
        "proof_note": "Company registered telephone line under MCA."
    }
    res = await qa_client.post("/challenges", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert "challenge_id" in data
    assert data["status"] == "under_review"

# 7. QA for GET & POST /license
@pytest.mark.asyncio
async def test_qa_license_status_and_update(qa_client: AsyncClient):
    # GET /license
    get_res = await qa_client.get("/license")
    assert get_res.status_code == 200
    status_data = get_res.json()
    assert "status" in status_data

    # POST /license with invalid signature -> 400
    invalid_lic = {
        "licensee": "Test Corp",
        "expires_at": "2030-01-01T00:00:00Z",
        "signature": "deadbeef"
    }
    bad_res = await qa_client.post("/license", json=invalid_lic)
    assert bad_res.status_code == 400
    assert "error" in bad_res.json()

# 8. QA for POST /check (Message & Link Checker)
@pytest.mark.asyncio
async def test_qa_checker_benign_message(qa_client: AsyncClient):
    # Legitimate bank transaction message
    payload = {
        "text": "Your account balance for Acct ending 1234 is INR 45,200.00 as of 31-Oct-2026. Thank you for banking with us.",
        "ui_language": "en"
    }
    res = await qa_client.post("/check?stream=false", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["band"] == "Low"
    assert data["score"] <= 30
    assert len(data["floors"]) == 0

@pytest.mark.asyncio
async def test_qa_checker_scam_message(qa_client: AsyncClient):
    # Electricity disconnection scam with pressure language and unverified contact
    payload = {
        "text": "Dear consumer your electricity power will be disconnected tonight at 9:30 PM from the electricity office because your bill was not updated. Immediately call electrical officer at +919876543210.",
        "ui_language": "en"
    }
    res = await qa_client.post("/check?stream=false", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["band"] in ("Suspicious", "High", "Critical")
    assert data["score"] >= 31
    assert data["scam_type"] == "electricity-disconnection"
    assert len(data["highlights"]) > 0
    assert len(data["advice"]) > 0

# 9. QA for POST /admin/reset
@pytest.mark.asyncio
async def test_qa_admin_reset(qa_client: AsyncClient):
    res = await qa_client.post("/admin/reset")
    assert res.status_code == 200
    assert res.json()["ok"] is True

# 10. QA for Admin Route Protection & Officer Login
@pytest.mark.asyncio
async def test_qa_admin_login_and_protection(qa_client: AsyncClient):
    # Unauthenticated call to /admin/disputes must be blocked with 401
    unauth_res = await qa_client.get("/admin/disputes")
    assert unauth_res.status_code == 401

    # Bad login credentials must be blocked with 401
    bad_login = await qa_client.post("/admin/login", json={"username": "admin", "password": "wrong_password"})
    assert bad_login.status_code == 401

    # Valid officer credentials must return 200 and token
    login_res = await qa_client.post("/admin/login", json={"username": "admin", "password": "scamradar-admin-2026"})
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert token_data["ok"] is True
    assert "token" in token_data

    # Access protected route with Bearer token
    headers = {"Authorization": f"Bearer {token_data['token']}"}
    auth_res = await qa_client.get("/admin/disputes", headers=headers)
    assert auth_res.status_code == 200
    assert "items" in auth_res.json()

    # 11. QA for Google Workspace Admin Authentication
    google_res = await qa_client.post("/admin/auth/google", json={
        "email": "officer.grievance@cybercrime.gov.in",
        "name": "Senior Grievance Officer (Google Verified)"
    })
    assert google_res.status_code == 200
    g_data = google_res.json()
    assert g_data["ok"] is True
    assert "token" in g_data
    assert g_data["badge_id"].startswith("GOV-GGL-")

    # Access protected route with Google token
    g_headers = {"Authorization": f"Bearer {g_data['token']}"}
    g_auth_res = await qa_client.get("/admin/disputes", headers=g_headers)
    assert g_auth_res.status_code == 200
    assert "items" in g_auth_res.json()


