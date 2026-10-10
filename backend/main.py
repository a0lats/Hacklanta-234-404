"""7 Days API. Stateless: no database, no accounts, no logging of user content."""

import json as _json
import os
from datetime import date as _date
from pathlib import Path as _Path
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

load_dotenv()

from answer_pdf import ATLANTA_DEFENSES, atlanta_answer, lagos_letter  # noqa: E402
from checks import run_checks  # noqa: E402
from explain import explain as explain_notice  # noqa: E402
from notice_reader import read_notice  # noqa: E402
from speak import text_to_speech  # noqa: E402

app = FastAPI(title="7 Days API")

# Set ALLOWED_ORIGINS on Render to the Vercel URL.
origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# ---------- Voice (ElevenLabs): text in, MP3 out. Nothing saved. ----------
@app.post("/speak")
async def speak(payload: dict = Body(...)):
    try:
        audio = text_to_speech(payload.get("text", ""), payload.get("lang", "english"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=502, detail="Voice service unavailable")
    return Response(content=audio, media_type="audio/mpeg")


# ---------- 7 Days endpoints. Shapes: CONTRACT.md at the repo root. ----------
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
