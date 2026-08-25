/**
 * Standardizes a coach's profile photo into a consistent, on-brand studio
 * headshot using Google's Gemini image model ("Nano Banana"). The coach's
 * real face is preserved — only the background, framing and lighting are
 * normalized so every profile picture on the marketplace shares one format.
 *
 * The engine is isolated here so it can be swapped for another provider
 * without touching the API route or UI. When GEMINI_API_KEY is not set the
 * feature is simply off and callers fall back to the coach's original photo.
 */

const STUDIO_PROMPT = [
  "You are preparing a professional profile photo for a padel coaching marketplace.",
  "Edit the supplied photo of a person into a clean studio headshot while keeping their",
  "real face, likeness, hair, skin tone, age and expression EXACTLY the same — do not",
  "change their identity or add or remove features.",
  "Replace the background with a smooth, softly-lit dark forest-green studio backdrop",
  "(deep wine around #38181f with a subtle lighter rose vignette).",
  "Frame it as a centred head-and-shoulders portrait, 1:1 square aspect ratio, the face",
  "in the upper-middle, with even, flattering studio lighting and gentle depth of field.",
  "Dress them in a plain, solid-colour athletic top with NO logos, text, numbers or brand",
  "marks of any kind. Keep it a natural, realistic photograph — not illustrated, cartoon",
  "or over-retouched.",
].join(" ");

/** Whether AI photo standardization is configured for this environment. */
export function photoStandardizationEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type InlinePart = {
  inlineData?: { data?: string; mimeType?: string };
  inline_data?: { data?: string; mime_type?: string };
};

/**
 * Transform a base64 image into the standardized studio headshot. Returns the
 * new image (base64 + mime type), or null when the feature is disabled so the
 * caller can fall back to the original. Throws on an actual API failure.
 */
export async function standardizeCoachPhoto(
  base64: string,
  mimeType: string
): Promise<{ base64: string; mimeType: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  // Model id is overridable so a rename (e.g. to Nano Banana Pro) needs no
  // code change: set GEMINI_IMAGE_MODEL in the environment.
  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: STUDIO_PROMPT },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini image API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: InlinePart[] } }[];
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      return {
        base64: inline.data,
        mimeType:
          part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? "image/png",
      };
    }
  }
  throw new Error("The image model did not return an image.");
}
