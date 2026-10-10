"""
Checks the receipt flow:  python test_receipt.py
"""

import hashlib

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

photo = b"pretend these are the photo's bytes"
h = hashlib.sha256(photo).hexdigest()

r = client.post("/receipt", json={"hash": h, "taken_at": "2026-03-09T07:42:00+01:00"})
print("issue:", r.status_code, r.json()["receipt"]["signed_at"])
rec = r.json()

ok = client.post("/verify-receipt", json={**rec, "hash": h}).json()
print("genuine photo:   ", ok["valid"], "-", ok["reason"])

edited = hashlib.sha256(photo + b" edited").hexdigest()
bad = client.post("/verify-receipt", json={**rec, "hash": edited}).json()
print("edited photo:    ", bad["valid"], "-", bad["reason"])

forged = {**rec["receipt"], "taken_at": "2026-03-01T00:00:00+01:00"}
bad2 = client.post("/verify-receipt", json={"receipt": forged, "signature": rec["signature"]}).json()
print("backdated receipt:", bad2["valid"], "-", bad2["reason"])

print("public key:", client.get("/public-key").json()["key_id"])
