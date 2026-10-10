"""
Loads NOSDRA Oil Spill Monitor data (oilspillmonitor.ng) and finds the official record for a spill.

Put the downloaded file at data/spills.csv (or data/spills.json).
Column names are matched loosely, so the real export works without renaming anything.
If no file is present, data/sample_official_record.json is used so the demo still runs.
"""

import csv
import json
import math
import os
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Our field name -> words that may appear in the real column header (lowercase)
ALIASES = {
    "spill_id": ["spill id", "spill_id", "incident id", "id"],
    "date": ["incident date", "date of incident", "spill date", "date"],
    "company": ["company", "operator", "facility owner"],
    "cause": ["cause", "compensation", "category"],
    "volume_bbl": ["estimated quantity", "quantity", "volume", "bbl"],
    "area": ["area", "impact area", "hectare"],
    "lat": ["latitude", "lat"],
    "lon": ["longitude", "lon", "lng"],
    "state": ["state"],
    "lga": ["lga", "local government"],
    "site": ["site", "location", "facility", "community"],
    "cleanup_status": ["clean-up", "cleanup", "clean up"],
}

DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d %b %Y", "%Y-%m-%dT%H:%M:%S")


def parse_date(value):
    if not value:
        return None
    value = str(value).strip()[:19]
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def to_float(value):
    try:
        return float(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _map_columns(headers):
    """Match each of our fields to the best real column header."""
    mapping = {}
    lower = {h: h.lower().strip() for h in headers}
    for field, words in ALIASES.items():
        for word in words:  # earlier words are preferred
            match = next((h for h, l in lower.items() if word == l), None) or \
                    next((h for h, l in lower.items() if word in l), None)
            if match and match not in mapping.values():
                mapping[field] = match
                break
    return mapping


# NOSDRA Oil Spill Monitor short codes
CAUSE_CODES = {
    "sab": "Sabotage / third party",
    "cor": "Corrosion",
    "eqf": "Equipment failure",
    "ome": "Operational / maintenance error",
}
STATE_CODES = {"BY": "Bayelsa", "RI": "Rivers", "DE": "Delta", "AK": "Akwa Ibom", "IM": "Imo",
               "AB": "Abia", "ON": "Ondo", "ED": "Edo", "LA": "Lagos", "CR": "Cross River"}

# For demos: hide real company names so simulated evidence never implies anything about a real operator
HIDE_COMPANY = os.getenv("WITNESS_DEMO_HIDE_COMPANY", "true").lower() == "true"


def normalize(row, mapping):
    rec = {field: row.get(col) for field, col in mapping.items()}
    code = str(rec.get("cause") or "").strip().lower()
    rec["cause"] = CAUSE_CODES.get(code, rec.get("cause"))
    state = str(rec.get("state") or "").strip()
    rec["state"] = STATE_CODES.get(state.upper(), state)
    if HIDE_COMPANY and rec.get("company"):
        rec["company"] = "Operator (withheld for demo)"
        row = {k: ("Operator (withheld for demo)" if k == mapping.get("company") else v) for k, v in row.items()}
    rec["volume_bbl"] = to_float(rec.get("volume_bbl"))
    rec["lat"] = to_float(rec.get("lat"))
    rec["lon"] = to_float(rec.get("lon"))
    rec["raw"] = row  # keep every original column for the letter / highlighting
    return rec


def load_records():
    csv_path = os.path.join(DATA_DIR, "spills.csv")
    json_path = os.path.join(DATA_DIR, "spills.json")
    rows = []
    if os.path.exists(csv_path):
        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
    elif os.path.exists(json_path):
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        rows = data if isinstance(data, list) else data.get("features") or data.get("data") or []
        rows = [r.get("properties", r) for r in rows]
    else:
        with open(os.path.join(DATA_DIR, "sample_official_record.json"), encoding="utf-8") as f:
            rows = [json.load(f)]
    if not rows:
        return []
    mapping = _map_columns(rows[0].keys())
    return [normalize(r, mapping) for r in rows]


def distance_km(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def find_official_record(spill_id=None, lat=None, lon=None, date=None, max_km=10, max_days=30):
    """Find by spill ID, or the closest record in place and time to the community's evidence."""
    records = load_records()
    if spill_id:
        for r in records:
            if str(r.get("spill_id", "")).strip() == str(spill_id).strip():
                return r
        return None

    target_date = parse_date(date) if date else None
    best, best_score = None, None
    for r in records:
        if lat is None or lon is None or r.get("lat") is None or r.get("lon") is None:
            continue
        km = distance_km(lat, lon, r["lat"], r["lon"])
        if km > max_km:
            continue
        days = 0
        if target_date:
            rd = parse_date(r.get("date"))
            if not rd:
                continue
            days = abs((rd - target_date).days)
            if days > max_days:
                continue
        score = km + days  # simple: closer in space and time wins
        if best_score is None or score < best_score:
            best, best_score = r, score
    return best
