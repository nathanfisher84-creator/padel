#!/usr/bin/env python3
"""
Batch-standardize the demo coach avatars into one on-brand studio format,
using the same Gemini image model ("Nano Banana") the live coach-photo
feature uses. Each coach's real face is preserved; only the background,
framing and lighting are normalized to a court-green studio headshot.

Reads and overwrites public/avatars/{carlos,sofia,diego}.jpg.

Requires GEMINI_API_KEY in the environment. Run locally, or on a GitHub
runner via .github/workflows/standardize-demo-photos.yml (key as a secret).
"""
import base64
import io
import json
import os
import sys
import urllib.error
import urllib.request

from PIL import Image

KEY = os.environ.get("GEMINI_API_KEY")
if not KEY:
    print("GEMINI_API_KEY is not set", file=sys.stderr)
    sys.exit(1)

MODEL = os.environ.get("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")

PROMPT = (
    "You are preparing a professional profile photo for a padel coaching "
    "marketplace. Edit the supplied photo of a person into a clean studio "
    "headshot while keeping their real face, likeness, hair, skin tone, age "
    "and expression EXACTLY the same — do not change their identity or add or "
    "remove features. Replace the background with a smooth, softly-lit dark "
    "forest-green studio backdrop (deep pine green around #10241a with a subtle "
    "lighter green vignette). Frame it as a centred head-and-shoulders portrait, "
    "1:1 square aspect ratio, the face in the upper-middle, with even, flattering "
    "studio lighting and gentle depth of field. Dress them in a plain, solid-colour "
    "athletic top with NO logos, text, numbers or brand marks of any kind. Keep it a "
    "natural, realistic photograph — not illustrated, cartoon or over-retouched."
)

ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"


def standardize(name: str) -> None:
    path = f"public/avatars/{name}.jpg"
    with open(path, "rb") as f:
        source_b64 = base64.b64encode(f.read()).decode()

    body = json.dumps(
        {
            "contents": [
                {
                    "parts": [
                        {"text": PROMPT},
                        {"inlineData": {"mimeType": "image/jpeg", "data": source_b64}},
                    ]
                }
            ],
            "generationConfig": {"responseModalities": ["IMAGE"]},
        }
    ).encode()

    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": KEY},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        detail = e.read()[:300].decode(errors="replace")
        print(f"{name}: Gemini HTTP {e.code}: {detail}", file=sys.stderr)
        sys.exit(1)

    parts = (data.get("candidates") or [{}])[0].get("content", {}).get("parts", [])
    img_b64 = None
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            img_b64 = inline["data"]
            break
    if not img_b64:
        print(f"{name}: the image model returned no image", file=sys.stderr)
        sys.exit(1)

    im = Image.open(io.BytesIO(base64.b64decode(img_b64))).convert("RGB")
    # Cover-crop to a square (centred horizontally, top-aligned to keep the
    # face) and normalize to 800x800 so every avatar matches.
    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    im = im.crop((left, 0, left + s, s)).resize((800, 800))
    im.save(path, "JPEG", quality=86)
    print(f"standardized {name} -> {path}")


if __name__ == "__main__":
    for coach in ("carlos", "sofia", "diego"):
        standardize(coach)
