"""
Signed evidence receipts.

When a photo is captured, the app sends ONLY its fingerprint (SHA-256 hash) + the phone's capture time.
The server signs {hash, taken_at, signed_at} with Witness's private key and returns the receipt.
Nothing is stored. Anyone can later verify the receipt with the public key (GET /public-key or /verify-receipt).

What it proves: this exact photo (byte for byte) existed no later than `signed_at` (server clock),
and neither the photo nor the receipt has been changed since. `taken_at` is what the phone reported.

Setup (once):  python receipt.py --new-key   → paste the printed line into .env (and into Render's env vars)
"""

import base64
import json
import os
import sys
from datetime import datetime, timezone

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from dotenv import load_dotenv

load_dotenv()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _load_private_key() -> Ed25519PrivateKey:
    secret = os.getenv("WITNESS_SIGNING_KEY")
    if secret:
        return Ed25519PrivateKey.from_private_bytes(_unb64(secret))
    # No key configured: make a temporary one so local testing still works.
    # Receipts made with a temporary key can't be verified after a restart — set the env var before the demo.
    print("WARNING: WITNESS_SIGNING_KEY not set; using a temporary key (run: python receipt.py --new-key)")
    return Ed25519PrivateKey.generate()


_PRIVATE = _load_private_key()
_PUBLIC = _PRIVATE.public_key()
PUBLIC_KEY_B64 = _b64(_PUBLIC.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw))
KEY_ID = PUBLIC_KEY_B64[:8]


def _canonical(receipt: dict) -> bytes:
    return json.dumps(receipt, sort_keys=True, separators=(",", ":")).encode()


def issue_receipt(photo_hash: str, taken_at: str | None = None) -> dict:
    photo_hash = (photo_hash or "").strip().lower()
    if len(photo_hash) != 64 or any(c not in "0123456789abcdef" for c in photo_hash):
        raise ValueError("hash must be a 64-character SHA-256 hex string")
    receipt = {
        "v": 1,
        "hash": photo_hash,
        "taken_at": taken_at,
        "signed_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "key_id": KEY_ID,
    }
    return {"receipt": receipt, "signature": _b64(_PRIVATE.sign(_canonical(receipt)))}


def verify_receipt(receipt: dict, signature: str, photo_hash: str | None = None,
                   public_key_b64: str | None = None) -> dict:
    """Valid only if the signature matches AND (when given) the photo's hash matches the receipt."""
    key = Ed25519PublicKey.from_public_bytes(_unb64(public_key_b64)) if public_key_b64 else _PUBLIC
    try:
        key.verify(_unb64(signature), _canonical(receipt))
    except (InvalidSignature, ValueError):
        return {"valid": False, "reason": "Signature does not match — receipt was altered or not issued by Witness"}
    if photo_hash and photo_hash.strip().lower() != receipt.get("hash"):
        return {"valid": False, "reason": "Photo does not match the receipt — the photo was changed"}
    return {"valid": True, "reason": "Receipt is genuine and unchanged",
            "photo_existed_by": receipt.get("signed_at"), "phone_reported_time": receipt.get("taken_at")}


if __name__ == "__main__" and "--new-key" in sys.argv:
    key = Ed25519PrivateKey.generate()
    raw = key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
    print(f"WITNESS_SIGNING_KEY={_b64(raw)}")
    print("Keep this secret. Put it in .env and in Render's environment variables. Never commit it to GitHub.")
