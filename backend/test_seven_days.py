import os

os.environ["DEMO_MODE"] = "1"

from fastapi.testclient import TestClient  # noqa: E402

from main import app  # noqa: E402

client = TestClient(app)

SAMPLE = {
    "jurisdiction": "atlanta", "case_number": "26-ED-SAMPLE-0419",
    "court": "Magistrate Court of Fulton County", "county": "Fulton",
    "landlord_name": "Peachtree Example Properties LLC",
    "tenant_name": "Jordan Sample",
    "property_address": "100 Example St SW, Apt 4B, Atlanta, GA 30310",
    "reason": "nonpayment", "amount_claimed": 1850, "currency": "USD",
    "served_on": "2026-10-10",
}


def test_health():
    assert client.get("/health").json()["status"] == "ok"


def test_read_notice_demo():
    r = client.post("/read-notice", files={"photo": ("n.jpg", b"fake", "image/jpeg")})
    assert r.json()["fields"]["served_on"] == "2026-10-10"


def test_check_demo_countdown():
    r = client.post("/check", json={"fields": SAMPLE, "extras": {"monthly_rent": 1100},
                                    "today": "2026-10-11"}).json()
    assert r["deadline"]["deadline"] == "2026-10-19"   # Sat Oct 17 -> Mon Oct 19
    assert r["deadline"]["days_left"] == 8
    ids = {c["id"] for c in r["cards"]}
    assert {"pay_to_end", "deadline_moved", "amount_high"} <= ids


def test_explain_en_es():
    for lang in ("en", "es"):
        r = client.post("/explain", json={"fields": SAMPLE, "lang": lang,
                                          "today": "2026-10-11"}).json()
        assert "October 19" in r["text"] or "octubre" in r["text"].lower() or "19" in r["text"]


def test_answer_pdf_only_marks_selected():
    r = client.post("/answer", json={"fields": SAMPLE, "selected_defenses": ["repairs"],
                                     "tenant": {"phone": "404-555-0100"}})
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"


def test_answer_rejects_unknown_defense():
    r = client.post("/answer", json={"fields": SAMPLE, "selected_defenses": ["made_up"]})
    assert r.status_code == 422


def test_lagos_short_notice():
    f = {"jurisdiction": "lagos", "landlord_name": "Chief Example",
         "notice_date": "2026-10-01", "vacate_by": "2026-10-15"}
    r = client.post("/check", json={"fields": f, "extras": {"rent_period": "yearly"}}).json()
    ids = {c["id"] for c in r["cards"]}
    assert "notice_too_short" in ids and "lagos_unverified" in ids
    e = client.post("/explain", json={"fields": f, "extras": {"rent_period": "yearly"},
                                      "lang": "pcm"}).json()
    assert "comot" in e["text"]
    p = client.post("/answer", json={"fields": f, "extras": {"rent_period": "yearly"}})
    assert p.content[:4] == b"%PDF"


def test_summary_pdf_atlanta_and_lagos():
    from fastapi.testclient import TestClient
    from main import app
    c = TestClient(app)
    r = c.post("/summary", json={
        "fields": {"jurisdiction": "atlanta", "served_on": "2026-10-10", "case_number": "26-ED-1",
                   "court": "Magistrate Court", "amount_claimed": 1850},
        "extras": {"monthly_rent": 900}, "today": "2026-10-10",
        "selected_defenses": ["paid", "bogus"], "own_words": "I paid in cash.",
    })
    assert r.status_code == 200 and r.content[:4] == b"%PDF"
    r = c.post("/summary", json={
        "fields": {"jurisdiction": "lagos", "notice_date": "2026-10-01", "vacate_by": "2026-10-15"},
        "extras": {"rent_period": "yearly"}, "lagos_force": {"locks": True, "things": False},
    })
    assert r.status_code == 200 and r.content[:4] == b"%PDF"
