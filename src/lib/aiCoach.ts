/**
 * The PadelPro AI Coach: watches a player's uploaded video with Google's
 * Gemini video-understanding model and produces the same deliverable a human
 * coach would — written feedback plus timestamped notes pinned to moments in
 * the video.
 *
 * Reuses the GEMINI_API_KEY already used for photo standardization. The
 * engine is isolated here so it can be swapped for another provider without
 * touching the API route or UI. Without a key the caller falls back to a
 * clearly-labelled demo review (dev/preview) or reports the feature off.
 */

import { readFile } from "fs/promises";
import path from "path";

const GEMINI_BASE = "https://generativelanguage.googleapis.com";

/** Whether real AI video reviews are configured for this environment. */
export function aiReviewEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Video model id; overridable so a rename needs no code change. */
function videoModel(): string {
  return process.env.GEMINI_VIDEO_MODEL ?? "gemini-2.5-flash";
}

export type AiComment = { timeSeconds: number; body: string };

export type AiReviewResult = {
  /** Formatted plain text for Feedback.content (rendered whitespace-pre-line). */
  content: string;
  /** Timestamped notes to pin on the analysis player. */
  comments: AiComment[];
};

export type AiReviewInput = {
  video: { kind: "url"; url: string } | { kind: "file"; path: string };
  title: string;
  notes: string | null;
  /** Human-readable focus shot labels, e.g. ["Bandeja", "Volleys"]. */
  focusShots: string[];
};

const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
};

/** What the model must return; enforced via Gemini's responseSchema. */
type AnalysisJson = {
  summary: string;
  strengths: string[];
  improvements: { issue: string; why: string; fix: string }[];
  drills: { name: string; how: string }[];
  comments: { timeSeconds: number; note: string }[];
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    improvements: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          issue: { type: "STRING" },
          why: { type: "STRING" },
          fix: { type: "STRING" },
        },
        required: ["issue", "why", "fix"],
      },
    },
    drills: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: { type: "STRING" }, how: { type: "STRING" } },
        required: ["name", "how"],
      },
    },
    comments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          timeSeconds: { type: "NUMBER" },
          note: { type: "STRING" },
        },
        required: ["timeSeconds", "note"],
      },
    },
  },
  required: ["summary", "strengths", "improvements", "drills", "comments"],
} as const;

function buildPrompt(input: AiReviewInput): string {
  const lines = [
    "You are an expert padel coach reviewing a player's uploaded video for a",
    "coaching marketplace. Watch the ENTIRE video carefully, then produce a",
    "personal video review addressed directly to the player as \"you\".",
    "",
    `The player titled the video: "${input.title}".`,
  ];
  if (input.notes) {
    lines.push(`The player's notes to the coach: "${input.notes}".`);
    lines.push(
      "If the notes describe which player they are (e.g. a shirt colour), analyse that player."
    );
  }
  if (input.focusShots.length) {
    lines.push(
      `The player asked you to focus especially on: ${input.focusShots.join(", ")}.`
    );
  }
  lines.push(
    "",
    "Be specific and concrete — refer to actual moments, shots and movement",
    "patterns you can see, never generic advice that could apply to any video.",
    "Use standard padel vocabulary (bandeja, víbora, chiquita, back-glass, net",
    "transition) where it applies. Be encouraging but honest.",
    "",
    "Return JSON with:",
    "- summary: 2-4 sentences on their game and level, addressed to the player.",
    "- strengths: 2-4 things they genuinely do well, each one sentence.",
    "- improvements: EXACTLY the 3 highest-impact things to fix. For each:",
    "  issue (short name), why (what you observed and why it costs them",
    "  points), fix (the concrete correction).",
    "- drills: 2-3 practice drills tailored to those fixes: name + how (2-3",
    "  sentences, doable on any padel court).",
    "- comments: 4-8 timestamped notes pinned to specific moments. timeSeconds",
    "  MUST be within the video's actual duration and point at the exact moment",
    "  the observation is visible. Each note is 1-2 sentences about that moment.",
    "",
    "Never include contact details, links or social handles."
  );
  return lines.join("\n");
}

/**
 * Upload the video to the Gemini Files API (resumable, single shot) and wait
 * until it is processed. Returns the file URI to reference in generation.
 */
async function uploadVideoToGemini(
  apiKey: string,
  bytes: Buffer,
  mimeType: string
): Promise<{ uri: string; mimeType: string }> {
  const start = await fetch(`${GEMINI_BASE}/upload/v1beta/files`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: "padel-submission" } }),
  });
  if (!start.ok) {
    throw new Error(`Gemini file upload start failed (${start.status}).`);
  }
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not return an upload URL.");

  const finish = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(bytes.byteLength),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(bytes),
  });
  if (!finish.ok) {
    throw new Error(`Gemini file upload failed (${finish.status}).`);
  }
  const uploaded = (await finish.json()) as {
    file?: { name?: string; uri?: string; state?: string; mimeType?: string };
  };
  const name = uploaded.file?.name;
  const uri = uploaded.file?.uri;
  if (!name || !uri) throw new Error("Gemini upload returned no file reference.");

  // Video needs server-side processing before it can be used in a prompt.
  let state = uploaded.file?.state ?? "PROCESSING";
  const deadline = Date.now() + 4 * 60 * 1000;
  while (state === "PROCESSING") {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for Gemini to process the video.");
    }
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`${GEMINI_BASE}/v1beta/${name}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!poll.ok) throw new Error(`Gemini file status check failed (${poll.status}).`);
    state = ((await poll.json()) as { state?: string }).state ?? "FAILED";
  }
  if (state !== "ACTIVE") {
    throw new Error("Gemini could not process this video format.");
  }
  return { uri, mimeType: uploaded.file?.mimeType ?? mimeType };
}

/** Load the submission's video bytes from Blob storage or local disk. */
async function loadVideo(
  video: AiReviewInput["video"]
): Promise<{ bytes: Buffer; mimeType: string }> {
  if (video.kind === "file") {
    const bytes = await readFile(video.path);
    const mimeType =
      MIME_BY_EXT[path.extname(video.path).toLowerCase()] ?? "video/mp4";
    return { bytes, mimeType };
  }
  const res = await fetch(video.url);
  if (!res.ok) throw new Error(`Could not fetch the video (${res.status}).`);
  const contentType = res.headers.get("content-type");
  const ext = path.extname(new URL(video.url).pathname).toLowerCase();
  const mimeType =
    (contentType?.startsWith("video/") ? contentType : null) ??
    MIME_BY_EXT[ext] ??
    "video/mp4";
  return { bytes: Buffer.from(await res.arrayBuffer()), mimeType };
}

function formatContent(a: AnalysisJson): string {
  const parts: string[] = [a.summary.trim()];

  if (a.strengths.length) {
    parts.push(
      "WHAT YOU'RE DOING WELL\n" +
        a.strengths.map((s) => `• ${s.trim()}`).join("\n")
    );
  }
  if (a.improvements.length) {
    parts.push(
      "THE 3 THINGS TO FIX FIRST\n" +
        a.improvements
          .map(
            (imp, i) =>
              `${i + 1}. ${imp.issue.trim()} — ${imp.why.trim()}\n   Fix: ${imp.fix.trim()}`
          )
          .join("\n")
    );
  }
  if (a.drills.length) {
    parts.push(
      "DRILLS FOR YOUR NEXT SESSION\n" +
        a.drills.map((d) => `• ${d.name.trim()}: ${d.how.trim()}`).join("\n")
    );
  }
  parts.push(
    "Generated by the PadelPro AI Coach after watching your full video. The timestamped notes above are pinned to the exact moments — click one to jump there."
  );
  return parts.join("\n\n");
}

/** Clamp, sort and de-noise the model's timestamped notes. */
function cleanComments(raw: AnalysisJson["comments"]): AiComment[] {
  return raw
    .filter((c) => Number.isFinite(c.timeSeconds) && c.timeSeconds >= 0 && c.note?.trim())
    .map((c) => ({
      timeSeconds: Math.round(c.timeSeconds * 10) / 10,
      body: c.note.trim().slice(0, 1000),
    }))
    .sort((a, b) => a.timeSeconds - b.timeSeconds)
    .slice(0, 12);
}

/**
 * Watch the video with Gemini and produce the review. Throws on any API
 * failure; returns null when the feature is not configured so the caller
 * can decide between demo mode and a clean "unavailable" error.
 */
export async function generateAiReview(
  input: AiReviewInput
): Promise<AiReviewResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const { bytes, mimeType } = await loadVideo(input.video);
  const file = await uploadVideoToGemini(apiKey, bytes, mimeType);

  const res = await fetch(
    `${GEMINI_BASE}/v1beta/models/${videoModel()}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
              { text: buildPrompt(input) },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.4,
        },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini video API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? "")
    .join("");
  if (!text) throw new Error("The model returned no analysis.");

  let analysis: AnalysisJson;
  try {
    analysis = JSON.parse(text) as AnalysisJson;
  } catch {
    throw new Error("The model returned malformed analysis JSON.");
  }

  return {
    content: formatContent(analysis),
    comments: cleanComments(analysis.comments ?? []),
  };
}

/**
 * Stand-in review for environments without a GEMINI_API_KEY (local dev and
 * demo previews), so the whole purchase → upload → instant-feedback loop can
 * be exercised. Clearly labelled — never pretends to have watched the video.
 */
export function demoAiReview(input: {
  title: string;
  focusShots: string[];
}): AiReviewResult {
  const focus = input.focusShots.length
    ? input.focusShots.join(", ")
    : "overall technique and positioning";
  const content = [
    `⚠ DEMO MODE — no AI key is configured on this deployment, so this is a sample of the review format (the video was not analysed). On the live platform this section is written by an AI model that watches your full video.`,
    `Thanks for sending "${input.title}". You asked for focus on: ${focus}.`,
    "WHAT YOU'RE DOING WELL\n• Good ready position between shots — racket up and weight forward.\n• You look to volley when you reach the net rather than staying passive.",
    "THE 3 THINGS TO FIX FIRST\n1. Bandeja preparation — the racket starts too low, so the shot becomes defensive.\n   Fix: turn side-on earlier and set the racket at head height before the ball drops.\n2. Net distance — you retreat to no-man's-land after each volley.\n   Fix: hold your ground 2-3 m from the net and recover forward, not backward.\n3. Lob depth — short lobs are gifting easy smashes.\n   Fix: aim for the back third; a lob that lands 1 m from the glass is unattackable.",
    "DRILLS FOR YOUR NEXT SESSION\n• Shadow bandejas: 3×10 slow-motion repetitions focusing on the early shoulder turn.\n• Volley-recover ladder: volley, touch the net tape line with your foot, recover — 2 minutes on, 1 off.",
    "Generated by the PadelPro AI Coach (demo mode).",
  ].join("\n\n");
  return {
    content,
    comments: [
      { timeSeconds: 5, body: "Sample pinned note: this is where a real analysis would highlight your first bandeja preparation. (Demo mode.)" },
      { timeSeconds: 15, body: "Sample pinned note: net positioning after the volley exchange would be annotated here. (Demo mode.)" },
    ],
  };
}
