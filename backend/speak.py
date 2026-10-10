"""
/speak — text in, spoken audio out (ElevenLabs).
Owner: you. Zero Data: nothing is saved or logged; audio is generated in memory and returned.

Setup:
    pip install elevenlabs python-dotenv
    .env needs:
        ELEVENLABS_API_KEY=...
        VOICE_ID_ENGLISH=...   (pick from the ElevenLabs voice library)
        VOICE_ID_PIDGIN=...    (can be the same Nigerian voice as English)
"""

import os

from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

load_dotenv()

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

VOICES = {
    "english": os.getenv("VOICE_ID_ENGLISH"),
    "pidgin": os.getenv("VOICE_ID_PIDGIN") or os.getenv("VOICE_ID_ENGLISH"),
    # 7 Days, Atlanta: Spanish. The multilingual model reads Spanish text; set a
    # Spanish-speaking voice in VOICE_ID_SPANISH for a natural accent.
    "spanish": os.getenv("VOICE_ID_SPANISH") or os.getenv("VOICE_ID_ENGLISH"),
}

# Multilingual model handles Nigerian English / Pidgin text best.
# Check the ElevenLabs docs for newer model IDs if this one sounds off.
MODEL_ID = "eleven_multilingual_v2"
MAX_CHARS = 2500  # keeps responses fast and protects our credits


def text_to_speech(text: str, lang: str = "english") -> bytes:
    """Return MP3 bytes for the given text. Raises ValueError on bad input."""
    text = (text or "").strip()
    if not text:
        raise ValueError("No text to speak")

    voice_id = VOICES.get(lang) or VOICES["english"]
    if not voice_id:
        raise ValueError("No voice configured — set VOICE_ID_ENGLISH in .env")

    audio_chunks = client.text_to_speech.convert(
        voice_id=voice_id,
        text=text[:MAX_CHARS],
        model_id=MODEL_ID,
        output_format="mp3_44100_128",
    )
    return b"".join(audio_chunks)
