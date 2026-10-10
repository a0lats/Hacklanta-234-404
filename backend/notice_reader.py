"""Read an eviction notice photo into structured fields with Gemini.

The tenant MUST confirm every field on screen before anything is calculated.
Nothing is saved: the image bytes go to Gemini once and are dropped.

If GEMINI_API_KEY is missing or the call fails/times out, we return empty
fields (all marked needs_confirmation) so the tenant can type them in.
DEMO_MODE=1 returns the sample notice fields instantly (for stage backup).
"""

from __future__ import annotations

import json
import os
import concurrent.futures

FIELDS = [
    "jurisdiction",      # "atlanta" | "lagos"
    "document_type",     # e.g. "dispossessory_affidavit", "quit_notice", "owner_intention_notice"
    "case_number",
    "court",             # e.g. "Magistrate Court of Fulton County"
    "county",            # e.g. "Fulton"
    "landlord_name",
    "tenant_name",
    "property_address",
    "reason",            # "nonpayment" | "holdover" | "other"
    "amount_claimed",    # number, in USD or NGN
    "currency",          # "USD" | "NGN"
    "served_on",         # YYYY-MM-DD (Atlanta: date sheriff served)
    "notice_date",       # YYYY-MM-DD (Lagos: date on the notice)
    "vacate_by",         # YYYY-MM-DD (Lagos: date notice says to leave)
]

SAMPLE_FIELDS = {
    "jurisdiction": "atlanta",
    "document_type": "dispossessory_affidavit",
    "case_number": "26-ED-SAMPLE-0419",
    "court": "Magistrate Court of Sample County, Georgia",
    "county": "Sample",
    "landlord_name": "Peachtree Example Properties LLC",
    "tenant_name": "Jordan Sample",
    "property_address": "100 Example St SW, Apt 4B, Atlanta, GA 30310",
    "reason": "nonpayment",
    "amount_claimed": 1850.00,
    "currency": "USD",
    "served_on": "2026-10-10",
    "notice_date": None,
    "vacate_by": None,
}

PROMPT = """You are reading a photo of an eviction document for a tenant.
Return ONLY a JSON object with exactly these keys:
{keys}

Rules:
- jurisdiction: "atlanta" for a Georgia court document, "lagos" for a Lagos/Nigeria notice.
- Dates must be YYYY-MM-DD. For served_on, use the date of service written by the
  sheriff/marshal if present; if you cannot find it, use null.
- amount_claimed: a number only (no currency symbols), or null.
- reason: "nonpayment", "holdover", or "other".
- If a value is not clearly visible, use null. Never guess or invent values.
Also include "unclear": a list of keys you were unsure about.
"""


def _empty():
    out = {k: None for k in FIELDS}
    return out


# Models tried in order. If the first is overloaded (503) or slow, the next one
# gets the rest of the time. Override with GEMINI_MODELS="a,b".
MODELS = [m.strip() for m in os.environ.get(
    "GEMINI_MODELS", os.environ.get("GEMINI_MODEL", "gemini-3.8-flash") + ",gemini-3.5-flash-lite"
).split(",") if m.strip()]
FIRST_TRY_S = 18.0  # how long the first model gets before we move on


def _call_gemini(image_bytes: bytes, mime_type: str, model: str | None = None) -> dict:
    from google import genai
    from google.genai import types

    model = model or MODELS[0]
    cfg = {"response_mime_type": "application/json", "temperature": 0}
    if model.startswith("gemini-3.8"):
        # Reading dates off a form doesn't need deep reasoning; "low" is much
        # faster than the default ("medium"). 3.8 Flash allows low/medium/high.
        cfg["thinking_config"] = types.ThinkingConfig(thinking_level=os.environ.get("GEMINI_THINKING", "low"))
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    resp = client.models.generate_content(
        model=model,
        contents=[types.Part.from_bytes(data=image_bytes, mime_type=mime_type), PROMPT.format(keys=", ".join(FIELDS))],
        config=types.GenerateContentConfig(**cfg),
    )
    return json.loads(resp.text)


def _with_timeout(fn, timeout_s, *args):
    """Run fn in a thread and stop WAITING after timeout_s (the thread is left
    to finish on its own; we never block on it)."""
    ex = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    try:
        return ex.submit(fn, *args).result(timeout=timeout_s)
    finally:
        ex.shutdown(wait=False, cancel_futures=True)


def gemini_read(image_bytes: bytes, mime_type: str, budget_s: float = 30.0):
    """Try each model in turn within the total budget.
    Returns (raw_dict or None, model_used or None, [errors])."""
    import time

    errors, deadline = [], time.monotonic() + budget_s
    for i, model in enumerate(MODELS):
        left = deadline - time.monotonic()
        if left < 3:
            break
        limit = min(left, FIRST_TRY_S) if i < len(MODELS) - 1 else left
        try:
            return _with_timeout(_call_gemini, limit, image_bytes, mime_type, model), model, errors
        except Exception as e:  # noqa: BLE001
            name = "Timeout" if isinstance(e, concurrent.futures.TimeoutError) else type(e).__name__
            errors.append(f"{model}: {name} {str(e)[:120]}")
    return None, None, errors


def read_notice(image_bytes: bytes, mime_type: str = "image/jpeg",
                timeout_s: float = 30.0) -> dict:
    """Returns {"fields": {...}, "unclear": [...], "source": "...", "note": ...}."""
    if os.environ.get("DEMO_MODE") == "1":
        return {"fields": dict(SAMPLE_FIELDS), "unclear": [],
                "source": "demo", "note": "Demo mode: sample notice fields."}

    if not os.environ.get("GEMINI_API_KEY"):
        return {"fields": _empty(), "unclear": list(FIELDS), "source": "manual",
                "note": "Could not read the photo. Please type the details."}

    raw, _model, _errors = gemini_read(image_bytes, mime_type, timeout_s)
    if raw is None:
        return {"fields": _empty(), "unclear": list(FIELDS), "source": "manual",
                "note": "Could not read the photo. Please type the details."}

    fields = _empty()
    for k in FIELDS:
        if k in raw:
            fields[k] = raw[k]
    unclear = [k for k in raw.get("unclear", []) if k in FIELDS]
    # Always force a check of the dates: the countdown depends on them.
    for k in ("served_on", "notice_date", "vacate_by"):
        if fields[k] is None and k not in unclear:
            unclear.append(k)
    return {"fields": fields, "unclear": unclear, "source": "gemini",
            "note": "Check every field against your paper before continuing."}
