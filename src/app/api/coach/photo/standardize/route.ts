import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { IMAGE_CONTENT_TYPES, MAX_PHOTO_BYTES } from "@/lib/storage";
import { standardizeCoachPhoto } from "@/lib/imageStandardize";

// The Gemini image edit can take several seconds; give the function room.
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Generates a standardized studio version of a coach's chosen profile photo
 * (before/after preview) without saving anything. The coach accepts or keeps
 * their original in the client, then submits the chosen image to
 * POST /api/coach/media as usual.
 *
 * Responses:
 *  - { available: false }            standardization is not configured
 *  - { available: true, image }      data: URL of the studio version
 *  - 502 { error }                   the image model failed
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return NextResponse.json({ error: "Coach account required." }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof File)) {
    return NextResponse.json({ error: "Attach a photo." }, { status: 400 });
  }
  if (!IMAGE_CONTENT_TYPES.includes(photo.type)) {
    return NextResponse.json(
      { error: "Photo must be a JPEG, PNG or WebP image." },
      { status: 400 }
    );
  }
  if (photo.size === 0 || photo.size > MAX_PHOTO_BYTES) {
    return NextResponse.json(
      { error: "Photo must be under 5 MB." },
      { status: 400 }
    );
  }

  const base64 = Buffer.from(await photo.arrayBuffer()).toString("base64");
  try {
    const result = await standardizeCoachPhoto(base64, photo.type);
    if (!result) return NextResponse.json({ available: false });
    return NextResponse.json({
      available: true,
      image: `data:${result.mimeType};base64,${result.base64}`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not generate a studio photo." },
      { status: 502 }
    );
  }
}
