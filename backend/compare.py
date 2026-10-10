"""
Compares the official NOSDRA record with the community's photo evidence and lists mismatches.

The checks are plain rules (no AI), so the demo gives the same result every time.
Wording always says "needs expert review" — never "proves".
Pidgin lines must be checked by a Nigerian teammate before the demo.
"""

import re

from official_data import distance_km, parse_date

SABOTAGE_WORDS = ("sabotage", "third-party", "third party", "vandal", "interference", "theft", "bunkering")
CORROSION_WORDS = ("corrosion", "corroded", "rust", "rusted", "pitting", "seam split", "equipment failure", "worn")

SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _area_hectares(text):
    """Turn '0.2 ha', '5,000 m2', '1.5 acres', '0.3 km2' into hectares."""
    if text is None:
        return None
    s = str(text).lower().replace(",", "")
    m = re.search(r"([\d.]+)\s*(ha|hectare|acre|km2|km²|m2|m²)?", s)
    if not m:
        return None
    value, unit = float(m.group(1)), (m.group(2) or "ha")
    return {"ha": value, "hectare": value, "acre": value * 0.4047,
            "km2": value * 100, "km²": value * 100, "m2": value / 10000, "m²": value / 10000}[unit]


def compare(official, photos):
    """
    official: record from find_official_record()
    photos: list of {"check": {...from /check-photo...}, "taken_at": "...", "gps": [lat, lon], "hash": "...",
                     "estimated_area_ha": optional number}
    Returns up to 3 mismatches, most severe first.
    """
    mismatches = []

    # 1. Start date: community photo earlier than the official start date
    official_date = parse_date(official.get("date"))
    photo_dates = [d for d in (parse_date(p.get("taken_at")) for p in photos) if d]
    if official_date and photo_dates:
        first = min(photo_dates)
        gap = (official_date.date() - first.date()).days
        if gap >= 1:
            mismatches.append({
                "title": "Dates don't match",
                "official_says": f"Spill started {official_date:%d %B %Y}",
                "evidence_shows": f"First photo taken {first:%d %B %Y}",
                "report_line": "date",
                "severity": "high" if gap >= 2 else "medium",
                "plain_english": f"Your photos show oil {gap} day{'s' if gap > 1 else ''} before the official start date.",
                "pidgin": f"Your picture show say oil don dey there {gap} day{'s' if gap > 1 else ''} before dem own date.",
            })

    # 2. Cause: officially "sabotage" but photos show corrosion / equipment failure
    cause = str(official.get("cause") or "").lower()
    photo_text = " ".join(
        f"{p.get('check', {}).get('damage_seen', '')} "
        f"{' '.join(b.get('label', '') for b in p.get('check', {}).get('boxes', []))}"
        for p in photos
    ).lower()
    if any(w in cause for w in SABOTAGE_WORDS) and any(w in photo_text for w in CORROSION_WORDS):
        mismatches.append({
            "title": "Cause needs expert review",
            "official_says": f"Cause recorded as: {official.get('cause')}",
            "evidence_shows": "Leak-point photos show signs of corrosion or equipment failure",
            "report_line": "cause",
            "severity": "high",
            "plain_english": "The record blames sabotage, but your photos show signs of corrosion. An independent expert should check the leak point.",
            "pidgin": "Dem talk say na sabotage, but your picture show say the pipe don rust. Make independent expert check am.",
        })

    # 3. Size: small reported volume / area vs large visible area
    reported_ha = _area_hectares(official.get("area"))
    observed_ha = max((p.get("estimated_area_ha") or 0) for p in photos) if photos else 0
    volume = official.get("volume_bbl")
    if observed_ha and ((reported_ha and observed_ha >= 3 * reported_ha) or (volume is not None and volume <= 50 and observed_ha >= 1)):
        area = official.get("area")
        if area and re.fullmatch(r"[\d.]+", str(area).strip()):
            area = f"{float(area):g} ha"
        reported = area or f"{volume:g} barrels"
        mismatches.append({
            "title": "Spill may be bigger than recorded",
            "official_says": f"Recorded size: {reported}" + (f", {volume:g} barrels" if volume is not None and official.get("area") else ""),
            "evidence_shows": f"Photos show oil across about {observed_ha:g} hectares",
            "report_line": "area" if official.get("area") else "volume_bbl",
            "severity": "medium",
            "plain_english": "Your photos show oil over a much larger area than the record says. The size should be re-checked.",
            "pidgin": "Your picture show say the oil spread pass wetin dem write. Make dem measure am again.",
        })

    # 4. Location: evidence far from the official coordinates
    if official.get("lat") is not None and official.get("lon") is not None:
        coords = [p["gps"] for p in photos if p.get("gps")]
        if coords:
            km = min(distance_km(official["lat"], official["lon"], c[0], c[1]) for c in coords)
            if km >= 2:
                mismatches.append({
                    "title": "Location doesn't match",
                    "official_says": f"Recorded at {official['lat']:.4f}, {official['lon']:.4f}",
                    "evidence_shows": f"Photos taken about {km:.1f} km away",
                    "report_line": "location",
                    "severity": "low",
                    "plain_english": f"Your photos were taken about {km:.1f} km from the recorded spill location.",
                    "pidgin": f"Where you snap the picture far from where dem write am, like {km:.1f} km.",
                })

    mismatches.sort(key=lambda m: SEVERITY_ORDER[m["severity"]])
    return mismatches[:3]
