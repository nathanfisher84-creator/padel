/**
 * The built-in AI padel coach ("Nova").
 *
 * Nova is Google Gemini equipped with a curated padel-coaching knowledge base
 * and tight guardrails so it behaves like a knowledgeable, padel-only coach —
 * strongest on the beginner and tactics segment. It powers two features:
 *
 *   1. an instant coaching chat (text), and
 *   2. instant analysis of a short uploaded clip (video → written review with
 *      timestamped notes).
 *
 * The engine is isolated here so the provider can be swapped without touching
 * the routes or UI. It is a no-op unless configured: set GEMINI_API_KEY to turn
 * it on. In local development you can instead set AI_COACH_FAKE=1 to exercise
 * the whole UX with canned responses (never honoured in production).
 */

import { db } from "@/lib/db";
import { FOCUS_SHOTS } from "@/lib/constants";

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

/** Whether the AI coach can actually answer (real key, or dev fake mode). */
export function aiCoachEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY) || fakeMode();
}

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
- Occasionally (not every message) remind the player they can upload a short
  clip for you to analyse, or book one of PadelPro's human coaches for an
  in-depth technique breakdown — especially for grooving technique or match
  prep. Do not be pushy about it.
- Never ask for or provide personal contact details; keep coaching on PadelPro.
`.trim();

function focusLabels(focusShots: string | null): string {
  if (!focusShots) return "";
  const labels = focusShots
    .split(",")
    .map((k) => FOCUS_SHOTS.find((s) => s.key === k)?.label ?? k);
  return labels.join(", ");
}

function videoInstruction(title: string, notes: string, focusShots: string | null): string {
  const focus = focusLabels(focusShots);
  return `
${PADEL_KNOWLEDGE}

TASK: Analyse this padel clip as coach Nova and produce a helpful review for the
player. The player titled it "${title}".${
    notes ? ` Their notes: "${notes}".` : ""
  }${focus ? ` They asked you to focus on: ${focus}.` : ""}

Watch the clip and coach what you can actually see — footwork, grip, preparation,
contact point, positioning, shot selection and movement as a pair. Be specific,
encouraging and actionable. If the clip is unclear or too short to judge
something, say so rather than guessing.

Respond ONLY as strict JSON in this exact shape:
{
  "summary": "2-4 short paragraphs of overall feedback (plain text, no markdown headings)",
  "notes": [ { "time": "M:SS", "note": "one specific, timestamped observation or fix" } ],
  "drills": [ "a concrete practice drill", "another drill" ]
}
Give 3-6 timestamped notes anchored to real moments in the clip, and 2-3 drills.
Keep each note to one sentence. Do not include any text outside the JSON.
`.trim();
}

// ---------------------------------------------------------------------------
// Gemini calls
// ---------------------------------------------------------------------------

const TEXT_MODEL = () => process.env.GEMINI_TEXT_MODEL ?? "gemini-2.5-flash";

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };

async function geminiGenerate(
  system: string,
  contents: { role: "user" | "model"; parts: GeminiPart[] }[],
  opts: { json?: boolean; maxOutputTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI coach is not configured.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL()}:generateContent`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: opts.maxOutputTokens ?? 1024,
        ...(opts.json ? { responseMimeType: "application/json" } : {}),
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
// Public API: chat
// ---------------------------------------------------------------------------

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function coachChat(messages: ChatMessage[]): Promise<string> {
  if (fakeMode()) {
    const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
    return `Great question! Here's the short version on "${last.slice(0, 60)}": keep the continental grip, lob deep to push the net players back, and move up with your partner as a unit. Try it 10 times next session. Want me to look at a clip of you doing it?`;
  }
  const contents = messages.slice(-16).map((m) => ({
    role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
    parts: [{ text: m.content }],
  }));
  return geminiGenerate(CHAT_SYSTEM, contents, { maxOutputTokens: 900 });
}

// ---------------------------------------------------------------------------
// Public API: video review
// ---------------------------------------------------------------------------

export type AiReview = {
  content: string;
  comments: { timeSeconds: number; body: string }[];
};

/** "1:23" | "83" | 83 -> seconds (clamped to >= 0). */
function parseTime(t: string | number): number {
  if (typeof t === "number") return Math.max(0, t);
  const s = t.trim();
  if (s.includes(":")) {
    const [m, sec] = s.split(":");
    return Math.max(0, (Number(m) || 0) * 60 + (Number(sec) || 0));
  }
  return Math.max(0, Number(s) || 0);
}

function buildReview(parsed: {
  summary?: string;
  notes?: { time?: string | number; note?: string }[];
  drills?: string[];
}): AiReview {
  const drills = (parsed.drills ?? []).filter(Boolean);
  const content = [
    parsed.summary?.trim() || "Here's my analysis of your clip.",
    drills.length
      ? "\nDrills to try:\n" + drills.map((d) => `• ${d}`).join("\n")
      : "",
    "\n— Nova (AI coach). For a deeper human breakdown of your technique, book one of our pro coaches.",
  ]
    .filter(Boolean)
    .join("\n");

  const comments = (parsed.notes ?? [])
    .filter((n) => n && n.note)
    .map((n) => ({ timeSeconds: parseTime(n.time ?? 0), body: String(n.note).trim() }))
    .slice(0, 12);

  return { content, comments };
}

/**
 * Analyse a submitted clip. When video bytes are supplied and within Gemini's
 * inline size limit, Nova watches the footage; otherwise it coaches from the
 * player's title/notes/focus and says so. Always returns a usable review.
 */
export async function analyzeSubmissionVideo(input: {
  title: string;
  notes: string | null;
  focusShots: string | null;
  video?: { base64: string; mimeType: string } | null;
}): Promise<AiReview> {
  if (fakeMode()) {
    return buildReview({
      summary:
        "Nice work getting this up! Your grip looks solid and you're getting the racquet back early. The main thing I'd change is your court position — you and your partner drift out of sync, leaving the middle open. When you're pushed back, throw up a deep lob and move in together rather than trying to drive through the net players.",
      notes: [
        { time: "0:04", note: "Good split-step here — keep that timing on every shot." },
        { time: "0:11", note: "You're one-up-one-back; recover level with your partner." },
        { time: "0:19", note: "Great chance to lob instead of driving into the net player's volley." },
      ],
      drills: [
        "Cross-court lob rally: 20 in a row aiming past the service line.",
        "Shadow the 'move up together' pattern after each lob for 5 minutes.",
      ],
    });
  }

  const instruction = videoInstruction(input.title, input.notes ?? "", input.focusShots);
  const parts: GeminiPart[] = [{ text: instruction }];
  if (input.video) {
    parts.push({ inlineData: { mimeType: input.video.mimeType, data: input.video.base64 } });
  } else {
    parts.push({
      text: "NOTE: The video could not be attached for direct analysis, so base your review on the title, notes and focus areas above, and make that limitation clear in the summary.",
    });
  }

  const raw = await geminiGenerate(
    PADEL_KNOWLEDGE,
    [{ role: "user", parts }],
    { json: true, maxOutputTokens: 1400 }
  );

  let parsed: Parameters<typeof buildReview>[0];
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Model didn't honour JSON — fall back to using the whole text as summary.
    parsed = { summary: raw };
  }
  return buildReview(parsed);
}
