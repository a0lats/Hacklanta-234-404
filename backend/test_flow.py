"""
End-to-end check of the demo case, no server needed:
    python test_flow.py
"""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

# 1. Find the REAL official NOSDRA record near where the photos were taken (record 475249, Bayelsa)
r = client.get("/official-record", params={"lat": 4.7525, "lon": 6.1030, "date": "2026-08-20"})
print("official-record:", r.status_code)
official = r.json()
print("  id:", official["spill_id"], "| cause:", official["cause"], "| date:", official["date"],
      "| volume:", official["volume_bbl"], "| state:", official["state"], "| company:", official["company"])

# 2. SIMULATED community evidence (for the demo only — say so on stage)
photos = [
    {"check": {"shot_type": "leak_point", "damage_seen": "Rust and a split along the pipe seam; oil pooling below",
               "boxes": [{"label": "corrosion", "box": [320, 410, 560, 690]}]},
     "taken_at": "2026-08-20T07:42:00+01:00", "gps": [4.7525, 6.1030], "hash": "9f2c41ab77e0"},
    {"check": {"shot_type": "wide", "damage_seen": "Oil sheen across the creek and mangrove roots", "boxes": []},
     "taken_at": "2026-08-20T07:45:00+01:00", "gps": [4.7527, 6.1032], "hash": "c81d03ee5a91",
     "estimated_area_ha": 6},
]

r = client.post("/compare", json={"official": official, "photos": photos, "lang": "pidgin"})
print("\ncompare:", r.status_code)
mismatches = r.json()["mismatches"]
for m in mismatches:
    print(f"  [{m['severity']}] {m['title']}: {m['official_says']}  vs  {m['evidence_shows']}")
    print(f"      pidgin: {m['pidgin']}")

r = client.post("/letter", json={"official": official, "mismatches": mismatches, "photos": photos})
print("\nletter:", r.status_code, "| source:", r.json()["source"])
print(r.json()["letter_text"])
print("\nPidgin summary:", r.json()["pidgin_summary"])
