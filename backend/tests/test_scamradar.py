import os
import json
import time
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_scenario_01_real_scam_wave(client: AsyncClient):
    """
    Scenario 1: 8 unrelated reporters, different IP prefixes,
    own-word detailed notes over two days -> KNOWN_SCAM
    """
    target_phone = "+919876500001"
    now = datetime.utcnow()

    notes = [
        "Got a video call from someone in a police uniform claiming an arrest warrant against my Aadhaar number.",
        "Fake CBI officer threatened to freeze my bank accounts unless I deposited 50000 rupees immediately.",
        "Scammer told me a FedEx parcel with contraband drugs was caught at customs under my name.",
        "Someone called claiming to be Mumbai cybercrime demanding payment via urgent RTGS.",
        "Impersonator on Skype forced me to stay on camera for three hours and demanded wire transfer.",
        "Received threatening phone call about money laundering case from this number.",
        "Caller said my passport was linked to criminal activity in Delhi and asked for verification fee.",
        "Fake enforcement directorate agent demanding money transfer to avoid immediate arrest."
    ]

    for i in range(8):
        occurred = (now - timedelta(hours=i * 6)).isoformat()
        res = await client.post("/reports", json={
            "reporter_id": f"reporter_legit_{i}",
            "ip_prefix": f"49.207.{i * 10}.0",
            "channel": "phone_call",
            "scam_type": "digital-arrest",
            "identifier_type": "phone",
            "identifier_value": target_phone,
            "pincode": "560102",
            "locality": "HSR Layout",
            "city": "Bengaluru",
            "note": notes[i],
            "occurred_at": occurred
        })
        assert res.status_code == 201

    lookup_res = await client.get(f"/lookup?type=phone&value={target_phone}")
    assert lookup_res.status_code == 200
    data = lookup_res.json()
    assert data["verdict"] == "KNOWN_SCAM"
    assert data["distinct_reporters"] >= 3
    assert data["display_value"] == target_phone


@pytest.mark.asyncio
async def test_scenario_02_report_bombing_burst(client: AsyncClient):
    """
    Scenario 2: 40 new accounts, similar/copied notes, one burst window,
    on a normal number -> Burst guard catches it -> NOT KNOWN_SCAM
    """
    target_phone = "+919876500002"
    now = datetime.utcnow().isoformat()

    for i in range(15):  # Sufficient to trigger the burst guard threshold
        res = await client.post("/reports", json={
            "reporter_id": f"bot_account_{i}",
            "ip_prefix": "103.21.244.0",  # Same IP prefix for all
            "channel": "phone_call",
            "scam_type": "job-offer",
            "identifier_type": "phone",
            "identifier_value": target_phone,
            "pincode": "560038",
            "locality": "Indiranagar",
            "city": "Bengaluru",
            "note": "Bad number",  # Short/identical note
            "occurred_at": now
        })
        assert res.status_code == 201

    lookup_res = await client.get(f"/lookup?type=phone&value={target_phone}")
    assert lookup_res.status_code == 200
    data = lookup_res.json()
    assert data["verdict"] != "KNOWN_SCAM"


@pytest.mark.asyncio
async def test_scenario_03_same_network_prefix_collapse(client: AsyncClient):
    """
    Scenario 3: 22 accounts on one ip_prefix -> distinct_reporters = 1
    """
    target_upi = "fakeuser123@okaxis"
    now = datetime.utcnow().isoformat()

    for i in range(10):
        res = await client.post("/reports", json={
            "reporter_id": f"user_wifi_{i}",
            "ip_prefix": "182.72.100.0",  # Identical network prefix
            "channel": "upi_request",
            "scam_type": "upi-refund-qr",
            "identifier_type": "upi",
            "identifier_value": target_upi,
            "pincode": "560034",
            "note": "Payment request fake refund scam",
            "occurred_at": now
        })
        assert res.status_code == 201

    lookup_res = await client.get(f"/lookup?type=upi&value={target_upi}")
    assert lookup_res.status_code == 200
    data = lookup_res.json()
    assert data["distinct_reporters"] == 1


@pytest.mark.asyncio
async def test_scenario_04_one_reporter_multiple_reports_merged(client: AsyncClient):
    """
    Scenario 4: One reporter, same number, 6 times in an hour -> 1 person, merged: true
    """
    target_phone = "+919876500004"
    reporter_id = "single_reporter_101"

    # First report
    res1 = await client.post("/reports", json={
        "reporter_id": reporter_id,
        "ip_prefix": "49.205.1.0",
        "channel": "phone_call",
        "scam_type": "electricity-disconnection",
        "identifier_type": "phone",
        "identifier_value": target_phone,
        "pincode": "560066",
        "note": "First report electricity bill scam"
    })
    assert res1.status_code == 201
    assert res1.json()["merged"] is False

    # Second report with same identifier and reporter
    res2 = await client.post("/reports", json={
        "reporter_id": reporter_id,
        "ip_prefix": "49.205.1.0",
        "channel": "phone_call",
        "scam_type": "electricity-disconnection",
        "identifier_type": "phone",
        "identifier_value": target_phone,
        "pincode": "560066",
        "note": "Second report same issue"
    })
    assert res2.status_code == 201
    assert res2.json()["merged"] is True

    lookup_res = await client.get(f"/lookup?type=phone&value={target_phone}")
    assert lookup_res.json()["distinct_reporters"] == 1


@pytest.mark.asyncio
async def test_scenario_05_junk_rejected_with_400(client: AsyncClient):
    """
    Scenario 5: "12345", "test", repeated digits -> 400
    """
    junk_cases = [
        ("phone", "12345"),
        ("phone", "9999999999"),
        ("phone", "1234567890"),
        ("phone", "test"),
        ("upi", "invalid_upi_without_at"),
        ("url", "not a url"),
        ("sender_id", "TOOLONGFORSMS"),
    ]

    for id_type, id_val in junk_cases:
        res = await client.post("/reports", json={
            "reporter_id": "rep_test",
            "ip_prefix": "10.0.0.0",
            "channel": "phone_call",
            "scam_type": "other",
            "identifier_type": id_type,
            "identifier_value": id_val,
            "pincode": "560102"
        })
        assert res.status_code == 400
        assert "error" in res.json()

        # Lookup should also reject junk with 400
        lookup_res = await client.get(f"/lookup?type={id_type}&value={id_val}")
        assert lookup_res.status_code == 400
        assert "error" in lookup_res.json()


@pytest.mark.asyncio
async def test_scenario_06_phone_normalisation_formats(client: AsyncClient):
    """
    Scenario 6: Four formats of one phone number -> Same normalised value, same lookup answer
    """
    formats = [
        "+91 98765 43210",
        "09876543210",
        "98765-43210",
        "919876543210"
    ]
    expected_normalised = "+919876543210"

    # Report using first format
    await client.post("/reports", json={
        "reporter_id": "reporter_fmt_1",
        "ip_prefix": "14.139.1.0",
        "channel": "phone_call",
        "scam_type": "lottery-prize",
        "identifier_type": "phone",
        "identifier_value": formats[0],
        "pincode": "560076",
        "note": "Lottery prize message scam"
    })

    # Lookup all 4 formats: should return same result
    for fmt in formats:
        res = await client.get(f"/lookup?type=phone&value={fmt}")
        assert res.status_code == 200
        data = res.json()
        assert data["report_count"] >= 1
        assert data["verdict"] in ("SUSPICIOUS", "KNOWN_SCAM")


@pytest.mark.asyncio
async def test_scenario_07_map_spike_alert(client: AsyncClient):
    """
    Scenario 7: Area with 2+ times its daily average and >= 5 reports; a normal area -> SPIKE alert
    """
    spike_pincode = "560100"  # Electronic City
    now = datetime.utcnow()

    # Generate 6 reports in last 24h
    for i in range(6):
        await client.post("/reports", json={
            "reporter_id": f"spike_rep_{i}",
            "ip_prefix": f"115.240.{i}.0",
            "channel": "sms_whatsapp",
            "scam_type": "digital-arrest",
            "identifier_type": "phone",
            "identifier_value": f"+9198760000{i:02d}",
            "pincode": spike_pincode,
            "occurred_at": (now - timedelta(hours=i + 1)).isoformat()
        })

    # Check /alerts for spike area
    res = await client.get(f"/alerts?pincode={spike_pincode}")
    assert res.status_code == 200
    alerts = res.json()["alerts"]
    types = [a["type"] for a in alerts]
    assert "SPIKE" in types


@pytest.mark.asyncio
async def test_scenario_08_new_type_alert(client: AsyncClient):
    """
    Scenario 8: A scam type new to an area -> NEW_TYPE alert
    """
    target_pin = "560011"  # Jayanagar
    now = datetime.utcnow()

    # Old report with digital-arrest 10 days ago
    await client.post("/reports", json={
        "reporter_id": "old_rep_1",
        "ip_prefix": "106.51.1.0",
        "channel": "phone_call",
        "scam_type": "digital-arrest",
        "identifier_type": "phone",
        "identifier_value": "+919876111111",
        "pincode": target_pin,
        "occurred_at": (now - timedelta(days=10)).isoformat()
    })

    # New scam type today: courier-customs
    await client.post("/reports", json={
        "reporter_id": "new_rep_2",
        "ip_prefix": "106.51.2.0",
        "channel": "phone_call",
        "scam_type": "courier-customs",
        "identifier_type": "phone",
        "identifier_value": "+919876222222",
        "pincode": target_pin,
        "occurred_at": (now - timedelta(hours=2)).isoformat()
    })

    res = await client.get(f"/alerts?pincode={target_pin}")
    assert res.status_code == 200
    alerts = res.json()["alerts"]
    types = [a["type"] for a in alerts]
    assert "NEW_TYPE" in types


@pytest.mark.asyncio
async def test_scenario_09_fake_wave_no_alert(client: AsyncClient):
    """
    Scenario 9: Fake wave caught by trust rules -> Ignored -> No alert triggered
    """
    fake_pin = "560078"
    now = datetime.utcnow().isoformat()

    # 10 identical reports from single IP prefix
    for i in range(10):
        await client.post("/reports", json={
            "reporter_id": f"bot_spammer_{i}",
            "ip_prefix": "172.56.0.0",
            "channel": "phone_call",
            "scam_type": "fake-kyc-link",
            "identifier_type": "phone",
            "identifier_value": "+919876999999",
            "pincode": fake_pin,
            "note": "fake report",
            "occurred_at": now
        })

    res = await client.get(f"/alerts?pincode={fake_pin}")
    assert res.status_code == 200
    alerts = res.json()["alerts"]
    # Fake wave must NOT trigger alerts
    assert len(alerts) == 0


@pytest.mark.asyncio
async def test_scenario_10_old_reports_not_on_map(client: AsyncClient):
    """
    Scenario 10: Month-old reports -> Not on the map (default 7 days)
    """
    old_pin = "560010"
    now = datetime.utcnow()

    # Report occurred 20 days ago
    await client.post("/reports", json={
        "reporter_id": "rep_old_map",
        "ip_prefix": "117.197.1.0",
        "channel": "phone_call",
        "scam_type": "job-offer",
        "identifier_type": "phone",
        "identifier_value": "+919876333333",
        "pincode": old_pin,
        "occurred_at": (now - timedelta(days=20)).isoformat()
    })

    res = await client.get("/map?days=7")
    assert res.status_code == 200
    clusters = res.json()["clusters"]
    pins = [c["pincode"] for c in clusters]
    assert old_pin not in pins


@pytest.mark.asyncio
async def test_scenario_11_fewer_than_3_reporters_masked_display(client: AsyncClient):
    """
    Scenario 11: Fewer than 3 reporters -> Masked display_value
    """
    target = "+919876543299"
    await client.post("/reports", json={
        "reporter_id": "rep_mask_1",
        "ip_prefix": "14.139.2.0",
        "channel": "phone_call",
        "scam_type": "fake-customer-care",
        "identifier_type": "phone",
        "identifier_value": target,
        "pincode": "560003"
    })

    res = await client.get(f"/lookup?type=phone&value={target}")
    assert res.status_code == 200
    data = res.json()
    assert data["distinct_reporters"] < 3
    # Masked: 98XXXXX299
    assert "XXXXX" in data["display_value"]
    assert data["display_value"] != target


@pytest.mark.asyncio
async def test_scenario_12_verified_numbers_and_senders(client: AsyncClient):
    """
    Scenario 12: Verified numbers and senders -> VERIFIED_BUSINESS (always wins)
    """
    verified_items = [
        ("phone", "1930"),
        ("phone", "18001600"),
        ("phone", "+918041002233"),
        ("sender_id", "HDFCBK"),
        ("upi", "pmcares@sbi"),
        ("url", "https://cybercrime.gov.in")
    ]

    for v_type, v_val in verified_items:
        res = await client.get(f"/lookup?type={v_type}&value={v_val}")
        assert res.status_code == 200
        data = res.json()
        assert data["verdict"] == "VERIFIED_BUSINESS"


@pytest.mark.asyncio
async def test_scenario_13_dispute_challenged_number(client: AsyncClient):
    """
    Scenario 13: Challenged number with reports -> Never KNOWN_SCAM, challenged: true
    """
    target_num = "+919876541122"

    chal_notes = [
        "Phoned my mother claiming her router was hacked and demanded Remote Desktop access.",
        "Scammer claimed my bank account was suspended due to unverified transactions.",
        "Fake tech support technician insisting I download AnyDesk to fix virus.",
        "Impersonated Microsoft windows defender team asking for credit card payment."
    ]

    # 4 independent reports to push into KNOWN_SCAM territory
    now = datetime.utcnow()
    for i in range(4):
        await client.post("/reports", json={
            "reporter_id": f"rep_chal_{i}",
            "ip_prefix": f"49.207.{i + 50}.0",
            "channel": "phone_call",
            "scam_type": "fake-customer-care",
            "identifier_type": "phone",
            "identifier_value": target_num,
            "pincode": "560024",
            "note": chal_notes[i],
            "occurred_at": (now - timedelta(hours=i * 5)).isoformat()
        })

    # Pre-challenge check: KNOWN_SCAM
    pre = await client.get(f"/lookup?type=phone&value={target_num}")
    assert pre.json()["verdict"] == "KNOWN_SCAM"

    # Submit dispute challenge
    chal_res = await client.post("/challenges", json={
        "identifier_type": "phone",
        "identifier_value": target_num,
        "claimant_name": "Bangalore Tech Support LLC",
        "contact_email": "support@techllc.in",
        "proof_note": "This is our official support telephone number registered with MCA."
    })
    assert chal_res.status_code == 201
    assert chal_res.json()["status"] == "under_review"

    # Post-challenge check: NEVER KNOWN_SCAM while under review
    post = await client.get(f"/lookup?type=phone&value={target_num}")
    post_data = post.json()
    assert post_data["challenged"] is True
    assert post_data["verdict"] != "KNOWN_SCAM"
    assert post_data["verdict"] == "SUSPICIOUS"


@pytest.mark.asyncio
async def test_scenario_14_licence_expiry_and_renewal(client: AsyncClient):
    """
    Scenario 14: Licence expired blocks endpoints with 403,
    and renewal via POST /license restores without restart and keeps data.
    """
    lic_dir = os.path.join(os.path.dirname(__file__), "..", "licenses")
    expired_path = os.path.join(lic_dir, "license_expired.json")
    long_path = os.path.join(lic_dir, "license_long.json")

    with open(expired_path, "r") as f:
        expired_lic = json.load(f)

    # 1. Upload expired licence
    up_res = await client.post("/license", json=expired_lic)
    assert up_res.status_code == 200

    # 2. Check that /health and /license still work
    health_res = await client.get("/health")
    assert health_res.status_code == 200

    lic_status = await client.get("/license")
    assert lic_status.status_code == 200
    assert lic_status.json()["status"] == "expired"

    # 3. Core endpoint should now be blocked with 403 LICENSE_EXPIRED
    lookup_blocked = await client.get("/lookup?type=phone&value=+919876543210")
    assert lookup_blocked.status_code == 403
    assert lookup_blocked.json()["error"] == "LICENSE_EXPIRED"

    # 4. Renew license dynamically via POST /license with long valid licence
    with open(long_path, "r") as f:
        long_lic = json.load(f)
    renew_res = await client.post("/license", json=long_lic)
    assert renew_res.status_code == 200
    assert renew_res.json()["status"] == "valid"

    # 5. Core endpoints now work again immediately without server restart!
    lookup_restored = await client.get("/lookup?type=phone&value=+919876543210")
    assert lookup_restored.status_code == 200


@pytest.mark.asyncio
async def test_scenario_15_lookup_speed_under_half_second(client: AsyncClient):
    """
    Scenario 15: Lookup speed after idle time -> Under 0.5 s
    """
    t0 = time.time()
    res = await client.get("/lookup?type=phone&value=+919876543210")
    duration = time.time() - t0
    assert res.status_code == 200
    assert duration < 0.5, f"Lookup took {duration:.3f}s (must be under 0.5s)"


@pytest.mark.asyncio
async def test_scenario_16_admin_reset(client: AsyncClient):
    """
    Scenario 16: POST /admin/reset -> Clean slate
    """
    target = "+919876500099"
    # Create a report
    await client.post("/reports", json={
        "reporter_id": "rep_reset_1",
        "ip_prefix": "10.0.0.1",
        "channel": "phone_call",
        "scam_type": "job-offer",
        "identifier_type": "phone",
        "identifier_value": target,
        "pincode": "560102"
    })

    # Reset
    reset_res = await client.post("/admin/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["ok"] is True

    # Lookup should now be NO_REPORTS
    post_lookup = await client.get(f"/lookup?type=phone&value={target}")
    assert post_lookup.status_code == 200
    assert post_lookup.json()["verdict"] == "NO_REPORTS"
    assert post_lookup.json()["report_count"] == 0
