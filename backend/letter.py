"""
Writes the dispute letter from the mismatches.

Uses Gemini for a natural letter + Pidgin summary. If Gemini fails or is slow,
a fixed template is used instead, so the demo never breaks.
"""

import json
import os
import threading
from datetime import date

from dotenv import load_dotenv

load_dotenv()

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-flash-latest")
GEMINI_TIMEOUT_S = float(os.getenv("GEMINI_LETTER_TIMEOUT", "12"))


def template_letter(official, mismatches, photos):
    site = official.get("site") or "the spill site"
    area_name = ", ".join(x for x in (official.get("lga"), official.get("state")) if x) or "our community"
    lines = [
        "To: National Oil Spill Detection and Response Agency (NOSDRA)",
        "Cc: State Ministry of Environment",
        f"Date: {date.today():%d %B %Y}",
        f"Re: Spill record {official.get('spill_id') or ''} — {site}",
        "",
        f"We, community monitors in {area_name}, respectfully dispute the following official findings for this spill:",
        "",
    ]
    for i, m in enumerate(mismatches, 1):
        lines.append(f"{i}. {m['title']}: {m['official_says']}. Our evidence: {m['evidence_shows']}.")
    lines += ["", "Evidence attached (digital fingerprints prove the photos have not been edited):"]
    for p in photos:
        lines.append(f"- Photo taken {p.get('taken_at', 'unknown time')} at {p.get('gps', 'unknown location')}: {p.get('hash', 'no fingerprint')}")
        rec = p.get("receipt") or {}
        if rec.get("signature"):
            lines.append(f"  Witness receipt: signed {rec['receipt'].get('signed_at')}, signature {rec['signature']}")
    if any((p.get("receipt") or {}).get("signature") for p in photos):
        lines += ["", "Each receipt can be independently verified with the Witness public key."]
    lines += [
        "",
        "We request an independent review of these findings before compensation is decided.",
        "",
        "Signed: Community monitor(s)",
    ]
    pidgin = "Dis letter talk say: " + " ".join(m["pidgin"] for m in mismatches) + " We dey ask make dem check am again before dem decide compensation."
    return {"letter_text": "\n".join(lines), "pidgin_summary": pidgin, "source": "template"}


def write_letter(official, mismatches, photos):
    if not mismatches:
        return {"letter_text": "", "pidgin_summary": "We no see any big difference between your evidence and the official record.", "source": "none"}

    base = template_letter(official, mismatches, photos)
    # Hard time limit: if Gemini is slow, return the template instantly so the app never stalls.
    box = {}
    worker = threading.Thread(target=lambda: box.update(result=_gemini_letter(base, photos)), daemon=True)
    worker.start()
    worker.join(GEMINI_TIMEOUT_S)
    if worker.is_alive():
        print(f"Gemini letter took over {GEMINI_TIMEOUT_S}s, using template")
        return base
    return box.get("result") or base


def _gemini_letter(base, photos):
    try:
        from google import genai

        client = genai.Client()
        prompt = (
            "You help Niger Delta community monitors write a short, formal, respectful dispute letter to NOSDRA "
            "about an oil spill record. Use ONLY the facts below. Never claim anything is proven; ask for independent review. "
            "Keep every photo fingerprint exactly as given. Max 250 words for the letter. "
            "Also write a 2-3 sentence summary in simple Nigerian Pidgin.\n\n"
            f"Draft to improve:\n{base['letter_text']}\n\n"
            'Return JSON: {"letter_text": "...", "pidgin_summary": "..."}'
        )
        resp = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json"},
        )
        raw = (resp.text or "").strip()
        if raw.startswith("```"):  # strip a ```json fence if the model added one
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
        data = json.loads(raw)
        letter = (data.get("letter_text") or "").strip()
        if letter:
            # Make sure every photo fingerprint is in the letter, exactly as captured
            missing = [p for p in photos if p.get("hash") and p["hash"] not in letter]
            if missing:
                letter += "\n\nEvidence fingerprints:\n" + "\n".join(
                    f"- Photo taken {p.get('taken_at', 'unknown time')}: {p['hash']}" for p in missing)
            return {"letter_text": letter, "pidgin_summary": data.get("pidgin_summary") or base["pidgin_summary"], "source": "gemini"}
    except Exception as e:
        print("Gemini letter failed, using template:", type(e).__name__, str(e)[:200])  # no user data logged
    return base
