import os
from typing import Optional

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

load_dotenv()

from compare import compare as compare_evidence  # noqa: E402
from letter import write_letter  # noqa: E402
from official_data import find_official_record  # noqa: E402
from receipt import KEY_ID, PUBLIC_KEY_B64, issue_receipt, verify_receipt  # noqa: E402
from speak import text_to_speech  # noqa: E402

app = FastAPI(title="Witness API")

# Set ALLOWED_ORIGINS on Render to Mo's Vercel URL once it exists.
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Zero Data: no database, no accounts, no logging of user content.


@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------- Travis: photo check ----------
@app.post("/check-photo")
async def check_photo(
    photo: UploadFile = File(...),
    expected_shot: str = Form(...),  # leak_point | pipe_condition | wide
):
    # STUB. Travis wires Gemini in ai.py later.
    return {
        "shot_type": expected_shot,
        "usable": True,
        "reason": "Leak point clearly visible",
        "damage_seen": "Rust and a split along the pipe seam; oil pooling below",
        "boxes": [{"label": "corrosion", "box": [320, 410, 560, 690]}],
        "needs_expert_review": True,
    }


# ---------- Official record (real NOSDRA data) ----------
@app.get("/official-record")
async def official_record(spill_id: Optional[str] = None, lat: Optional[float] = None,
                          lon: Optional[float] = None, date: Optional[str] = None):
    record = find_official_record(spill_id=spill_id, lat=lat, lon=lon, date=date)
    if not record:
        raise HTTPException(status_code=404, detail="No matching official record found")
    return {k: v for k, v in record.items() if k != "raw"} | {"all_fields": record.get("raw", {})}


@app.post("/read-report")
async def read_report(photo: UploadFile = File(...)):
    # Kept for compatibility. The demo uses /official-record (real NOSDRA data) instead.
    return {
        "date": "2026-03-12",
        "location": "Kpean, Khana LGA, Rivers State",
        "cause": "Sabotage",
        "volume_barrels": 20,
        "area": "0.2 hectares",
        "signed_by": ["Operator", "NOSDRA"],
        "lines": {"cause": "Cause of spill: third-party interference (sabotage)"},
    }


def _official_from(payload: dict) -> dict:
    """Accept {"official": ...} (from /official-record) or {"report": ...} (team contract)."""
    official = payload.get("official") or payload.get("report") or {}
    if "volume_bbl" not in official and "volume_barrels" in official:
        official = {**official, "volume_bbl": official["volume_barrels"]}
    return official


# ---------- Jade: compare + letter ----------
@app.post("/compare")
async def compare(payload: dict = Body(...)):
    official = _official_from(payload)
    if not official:
        raise HTTPException(status_code=400, detail="Send the official record as 'official' or 'report'")
    return {"mismatches": compare_evidence(official, payload.get("photos", []))}


@app.post("/letter")
async def letter(payload: dict = Body(...)):
    return write_letter(_official_from(payload), payload.get("mismatches", []), payload.get("photos", []))


# ---------- Voice (ElevenLabs) ----------
@app.post("/speak")
async def speak(payload: dict = Body(...)):
    try:
        audio = text_to_speech(payload.get("text", ""), payload.get("lang", "english"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Voice service unavailable")
    return Response(content=audio, media_type="audio/mpeg")


# ---------- Signed evidence receipts (nothing stored) ----------
@app.post("/receipt")
async def receipt(payload: dict = Body(...)):
    try:
        return issue_receipt(payload.get("hash", ""), payload.get("taken_at"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/verify-receipt")
async def verify(payload: dict = Body(...)):
    return verify_receipt(payload.get("receipt", {}), payload.get("signature", ""), payload.get("hash"))


@app.get("/public-key")
async def public_key():
    return {"algorithm": "Ed25519", "key_id": KEY_ID, "public_key": PUBLIC_KEY_B64}


# =====================================================================
# 7 Days: eviction papers. Stateless; see CONTRACT.md at the repo root.
# =====================================================================
import json as _json  # noqa: E402
from datetime import date as _date  # noqa: E402
from pathlib import Path as _Path  # noqa: E402
from typing import Literal  # noqa: E402

from pydantic import BaseModel, Field  # noqa: E402

from answer_pdf import ATLANTA_DEFENSES, atlanta_answer, lagos_letter  # noqa: E402
from checks import run_checks  # noqa: E402
from explain import explain as explain_notice  # noqa: E402
from notice_reader import read_notice  # noqa: E402

LEGAL_AID = _json.loads((_Path(__file__).parent / "data" / "legal_aid.json").read_text())
MAX_IMAGE_BYTES = 8 * 1024 * 1024


class NoticeFields(BaseModel):
    jurisdiction: Literal["atlanta", "lagos"] = "atlanta"
    document_type: Optional[str] = None
    case_number: Optional[str] = None
    court: Optional[str] = None
    county: Optional[str] = None
    landlord_name: Optional[str] = None
    tenant_name: Optional[str] = None
    property_address: Optional[str] = None
    reason: Optional[str] = None
    amount_claimed: Optional[float] = None
    currency: Optional[str] = None
    served_on: Optional[str] = None
    notice_date: Optional[str] = None
    vacate_by: Optional[str] = None


class NoticeExtras(BaseModel):
    monthly_rent: Optional[float] = None
    locked_out: bool = False
    utilities_cut: bool = False
    rent_period: Optional[Literal["weekly", "monthly", "quarterly", "half_yearly", "yearly"]] = None


class CheckRequest(BaseModel):
    fields: NoticeFields
    extras: NoticeExtras = Field(default_factory=NoticeExtras)
    today: Optional[str] = None  # YYYY-MM-DD override for tests/demo


class ExplainRequest(CheckRequest):
    lang: Literal["en", "es", "pcm"] = "en"


class TenantInfo(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class AnswerRequest(CheckRequest):
    tenant: TenantInfo = Field(default_factory=TenantInfo)
    selected_defenses: list[str] = Field(default_factory=list)
    own_words: str = ""


def _today(s):
    return _date.fromisoformat(s) if s else None


@app.post("/read-notice")
async def read_notice_ep(photo: UploadFile = File(...)):
    data = await photo.read()
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Photo too large (max 8 MB).")
    result = read_notice(data, photo.content_type or "image/jpeg")
    del data  # read once, never stored
    return result


@app.post("/check")
async def check_ep(req: CheckRequest):
    return run_checks(req.fields.model_dump(), req.extras.model_dump(), today=_today(req.today))


@app.post("/explain")
async def explain_ep(req: ExplainRequest):
    fields = req.fields.model_dump()
    chk = run_checks(fields, req.extras.model_dump(), today=_today(req.today))
    return explain_notice(fields, chk, req.lang)


@app.get("/defenses")
async def defenses():
    return [{"id": k, "text": t} for k, t in ATLANTA_DEFENSES]


@app.post("/answer")
async def answer_ep(req: AnswerRequest):
    fields = req.fields.model_dump()
    chk = run_checks(fields, req.extras.model_dump(), today=_today(req.today))
    valid = {k for k, _ in ATLANTA_DEFENSES}
    bad = [d for d in req.selected_defenses if d not in valid]
    if bad:
        raise HTTPException(status_code=422, detail=f"Unknown defense ids: {bad}")
    if fields["jurisdiction"] == "lagos":
        pdf, name = lagos_letter(fields, req.tenant.model_dump(), chk), "reply-to-notice-draft.pdf"
    else:
        pdf = atlanta_answer(fields, req.tenant.model_dump(), req.selected_defenses,
                             req.own_words, chk.get("deadline"))
        name = "answer-draft.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{name}"',
                             "Cache-Control": "no-store"})


@app.get("/legal-aid")
async def legal_aid(jurisdiction: Literal["atlanta", "lagos"] = "atlanta"):
    return {"places": LEGAL_AID.get(jurisdiction, []), "note": LEGAL_AID["_note"]}
