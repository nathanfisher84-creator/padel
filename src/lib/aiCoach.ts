/**
 * The built-in AI padel coach ("Nova").
 *
 * Nova is Google Gemini equipped with a curated padel-coaching knowledge base
 * and tight guardrails so it behaves like a knowledgeable, padel-only coach.
 * It powers two features:
 *
 *   1. a FREE instant coaching chat (text) — the lead magnet, and
 *   2. PAID instant video reviews: Nova watches the player's full uploaded
 *      video (via the Gemini Files API, so full-length match videos work, not
 *      just short clips) and delivers written feedback plus timestamped notes
 *      pinned to moments in the footage — the same deliverable a human coach
 *      produces, in minutes. The platform keeps 100% of these payments.
 *
 * The engine is isolated here so the provider can be swapped without touching
 * the routes or UI. Set GEMINI_API_KEY to turn it on; in local development
 * AI_COACH_FAKE=1 exercises the chat UX with canned responses (never honoured
 * in production), and video reviews fall back to a clearly-labelled demo.
 */

import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

const GEMINI_BASE = "https://generativelanguage.googleapis.com";

export const AI_COACH_EMAIL = "nova@padelpro.ai";
export const AI_COACH_NAME = "Nova";

/** The AI coach user (with profile), or null if it hasn't been seeded yet. */
export async function getAiCoach() {
  return db.user.findFirst({
    where: { email: AI_COACH_EMAIL },
    include: { coachProfile: true },
  });
}

function fakeMode(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AI_COACH_FAKE === "1";
}

/** Whether the AI coach chat can answer (real key, or dev fake mode). */
export function aiCoachEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY) || fakeMode();
}

/** Whether real (paid) AI video reviews are configured for this environment. */
export function aiReviewEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Chat model id; overridable so a rename needs no code change. */
const TEXT_MODEL = () => process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";
/** Video-analysis model id (video-capable). */
const VIDEO_MODEL = () => process.env.GEMINI_VIDEO_MODEL ?? "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// Knowledge base + guardrails
// ---------------------------------------------------------------------------

const PADEL_KNOWLEDGE = `
You are Nova, an expert padel coach. Padel is a racquet sport played in an
enclosed glass-and-mesh court (10m x 20m), almost always in doubles, with
solid stringless racquets and a slightly depressurised tennis ball. Points can
continue off the walls. Scoring follows tennis (15/30/40/game, sets to 6).

CORE FUNDAMENTALS you coach:
- Grip: the continental ("hammer") grip for almost everything; it lets players
  hit forehands, backhands, volleys and overheads without switching.
- Ready position & footwork: racquet up and in front, small split-step as the
  opponent strikes, move with the feet not by reaching.
- The golden rule of positioning: you and your partner move as a unit, roughly
  side by side, both back or both up — never one up, one back if avoidable.
- The net is where points are won: the attacking team controls the net; the
  defending team plays from the back and tries to earn the net.

SHOT LIBRARY:
- Serve: underarm, below the waist, bounce once, hit into the diagonal box.
  Serve then move IN to the net.
- Return: block deep and follow tactics; against net rushers, a low return or a
  lob buys time.
- Volley: short, punchy, continental grip, out in front; used to hold the net.
- Bandeja: the signature defensive/controlling overhead — a slice "tray" shot
  hit at ~shoulder-to-head height, flat trajectory with slice, that keeps you at
  the net without over-committing. The bread-and-butter overhead.
- Víbora: a more aggressive, spinnier cousin of the bandeja hit with a whippy
  wrist, kicking off the side glass.
- Smash / bajada: the finishing overhead; the "por 3" or "por 4" flat smash
  aims to bounce the ball out over the glass.
- Lob (globo): the most important defensive AND tactical shot in padel — a high,
  deep lob over the net players pushes them back and lets you take the net.
- Chiquita: a low, soft ball played at the incoming net player's feet to force a
  weak, upward reply so you can move up.
- Wall play: let the ball pass, read the rebound, and hit after the bounce off
  the back or side glass — patience beats panic.

BEGINNER PRIORITIES (in order): continental grip; lob deep and often; let balls
go to the back glass and play the rebound; move up together after a good lob;
keep the ball in play — padel rewards consistency over power.

COMMON BEGINNER MISTAKES: switching grips, smashing everything instead of using
the bandeja, standing one-up-one-back, hitting flat into the net players' feet
from the back, over-hitting off the walls, and never lobbing.

TACTICS: win the net, use the lob to flip positions, target the weaker opponent
and the middle (the "who's-ball?" gap), be patient and build the point, and hit
to feet or to open glass angles rather than always going for winners.
`.trim();

const CHAT_SYSTEM = `
${PADEL_KNOWLEDGE}

YOUR ROLE IN CHAT:
- You are Nova, PadelPro's friendly AI coach. Coach the player conversationally.
- Stay strictly on padel: technique, tactics, positioning, drills, rules,
  equipment, fitness for padel, and match strategy. If asked about anything
  unrelated, warmly redirect to padel in one sentence.
- Be encouraging and clear — most people asking are beginners or improvers.
- Keep answers concise and practical: lead with the key idea, then 2–4 short
  actionable points or a simple drill. Use plain language; explain any padel
  term you use. Prefer short paragraphs or tight bullet lists.
- Never invent facts. If something depends on seeing them play, say so.
- Occasionally (not every message) remind the player that for things you'd
  need to see, they can get an instant AI video review from you (a low-cost
  one-off — you watch their full video and pin timestamped notes to it), or
  book one of PadelPro's human coaches for an in-depth technique breakdown.
  Do not be pushy about it.
- Never ask for or provide personal contact details; keep coaching on PadelPro.
`.trim();

// ---------------------------------------------------------------------------
// Gemini text/chat calls
// ---------------------------------------------------------------------------

type GeminiPart = { text?: string };

async function geminiGenerate(
  system: string,
  contents: { role: "user" | "model"; parts: GeminiPart[] }[],
  opts: { maxOutputTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI coach is not configured.");

  const endpoint = `${GEMINI_BASE}/v1beta/models/${TEXT_MODEL()}:generateContent`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("The AI coach did not return a response.");
  return text;
}

// ---------------------------------------------------------------------------
// Public API: chat (free)
// ---------------------------------------------------------------------------

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function coachChat(messages: ChatMessage[]): Promise<string> {
  if (fakeMode()) {
    const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    return `Great question! Here's the short version on "${last.slice(0, 60)}": keep the continental grip, lob deep to push the net players back, and move up with your partner as a unit. Try it 10 times next session. Want me to watch a video of you doing it? An instant review pins my notes to your actual footage.`;
  }
  const contents = messages.slice(-16).map((m) => ({
    role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
    parts: [{ text: m.content }],
  }));
  return geminiGenerate(CHAT_SYSTEM, contents, { maxOutputTokens: 900 });
}

// ---------------------------------------------------------------------------
// Public API: video review (paid) — full videos via the Gemini Files API
// ---------------------------------------------------------------------------

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

function buildReviewPrompt(input: AiReviewInput): string {
  const lines = [
    PADEL_KNOWLEDGE,
    "",
    "TASK: You are reviewing a player's uploaded video for a coaching",
    "marketplace. Watch the ENTIRE video carefully, then produce a personal",
    "video review addressed directly to the player as \"you\".",
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
    "If the footage is unclear or too short to judge something, say so rather",
    "than guessing. Be encouraging but honest.",
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
    `— ${AI_COACH_NAME} (AI coach), after watching your full video. The timestamped notes above are pinned to the exact moments — click one to jump there. For a deep human breakdown of your technique, our pro coaches are one click away.`
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
    `${GEMINI_BASE}/v1beta/models/${VIDEO_MODEL()}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { fileData: { fileUri: file.uri, mimeType: file.mimeType } },
              { text: buildReviewPrompt(input) },
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
    `— ${AI_COACH_NAME} (AI coach, demo mode).`,
  ].join("\n\n");
  return {
    content,
    comments: [
      { timeSeconds: 5, body: "Sample pinned note: this is where a real analysis would highlight your first bandeja preparation. (Demo mode.)" },
      { timeSeconds: 15, body: "Sample pinned note: net positioning after the volley exchange would be annotated here. (Demo mode.)" },
    ],
  };
}
