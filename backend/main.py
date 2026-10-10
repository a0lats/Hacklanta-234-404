import os
from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

load_dotenv()

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


@app.get("/health")
async def health():
    return {"status": "ok"}


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


@app.post("/read-report")
async def read_report(photo: UploadFile = File(...)):
    # STUB. Jade wires Gemini later.
    return {
        "date": "2026-03-12",
        "location": "Kpean, Khana LGA, Rivers State",
        "cause": "Sabotage",
        "volume_barrels": 20,
        "area": "0.2 hectares",
        "signed_by": ["Operator", "NOSDRA"],
        "lines": {"cause": "Cause of spill: third-party interference (sabotage)"},
    }


@app.post("/compare")
async def compare(payload: dict = Body(...)):
    # STUB. Jade replaces with real checks.
    return {
        "mismatches": [
            {
                "title": "Dates don't match",
                "official_says": "Spill started 12 March",
                "evidence_shows": "First photo taken 9 March",
                "report_line": "date",
                "severity": "high",
                "plain_english": "Your photos show oil 3 days before the official start date.",
                "pidgin": "Your picture show say oil don dey there 3 days before dem own date.",
            }
        ]
    }


@app.post("/letter")
async def letter(payload: dict = Body(...)):
    # STUB. Jade replaces with Gemini.
    return {
        "letter_text": "To: NOSDRA\n\nSAMPLE LETTER. Replace with generated text.",
        "pidgin_summary": "Sample summary for Pidgin.",
    }


@app.post("/speak")
async def speak(payload: dict = Body(...)):
    # STUB. Returns empty audio until ElevenLabs is wired in.
    return Response(content=b"", media_type="audio/mpeg")