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
const TEXT_MODEL = () => process.env.GEMINI_TEXT_MODEL ?? "gemini-3.5-flash";
/**
 * Video-analysis model id. gemini-3.5-flash is the stable GA flagship (there
 * is no "gemini-3.5-pro"; the Pro tier is still a preview model — override
 * with GEMINI_VIDEO_MODEL to experiment, e.g. gemini-3.1-pro-preview).
 */
const VIDEO_MODEL = () => process.env.GEMINI_VIDEO_MODEL ?? "gemini-3.5-flash";

// ---------------------------------------------------------------------------
// Knowledge base + guardrails
// ---------------------------------------------------------------------------

const PADEL_KNOWLEDGE = `
You are Nova, an expert padel coach with deep knowledge of technique,
biomechanics, tactics and training methodology. Padel is a racquet sport played
in an enclosed glass-and-mesh court (10m x 20m), almost always in doubles, with
solid stringless racquets and a slightly depressurised tennis ball. Points can
continue off the walls. Scoring follows tennis (15/30/40/game, sets to 6).

=== LEVEL ASSESSMENT MARKERS ===
Place every player on this ladder before advising — the right fix depends on it.
- BEGINNER: switches grips or uses a frying-pan grip; hits flat and hard from
  the back; retreats from or panics at the glass; rarely lobs; one-up-one-back
  positioning; big loopy swings on volleys; no split-step.
- IMPROVER: continental grip most of the time; can lob but too short; plays the
  back glass on easy balls but blocks awkwardly on fast ones; follows a good
  lob to the net but doesn't hold position; bandeja exists but floats or sits up.
- INTERMEDIATE: reliable back-glass play; bandeja keeps net position under
  moderate pressure; recognises when to lob vs drive; moves roughly as a unit;
  weaknesses show under pressure — víbora/smash selection, transition zone
  hesitation, covering the middle.
- ADVANCED: full overhead family (bandeja/víbora/rulo/flat smash) chosen by
  ball height and position; deliberate point construction; counter-attacks off
  the double glass; consistent chiquitas; weaknesses are marginal (percentages,
  disguise, fitness late in matches).
Coach one level up, not three: a beginner drilling víbora spin is wasted effort;
an advanced player told "use continental grip" is patronised.

=== TECHNIQUE CHECKPOINTS (what correct looks like, and common faults) ===
- READY POSITION & SPLIT-STEP: knees soft, racquet up at chest height in front,
  weight on the balls of the feet; a small hop timed to the opponent's contact.
  Faults: racquet at the waist (late volleys), flat feet (beaten by pace),
  standing tall (no push-off).
- SERVE: underarm, contact at or below waist height after one bounce, into the
  diagonal box. Good servers vary placement (glass serve vs T serve vs body),
  keep it low with slice, and are moving forward BEFORE the opponent strikes
  the return. Faults: serving and watching, contact too high, same serve every
  point, drifting in slowly and getting caught mid-court.
- RETURN: priority is neutralising the server's net advantage — deep block down
  the middle, low chiquita to the incomer's feet, or lob over the server's
  partner. Faults: trying to win the point outright, flat drives at net players'
  chests (free volley), returning cross-court short.
- VOLLEY: continental grip, compact punch from the shoulder, contact out in
  front, racquet head above wrist, slight slice for control, recover to net
  position immediately. First volley from the service line is about DEPTH, not
  winners. Faults: backswing behind the shoulder plane, wrist flick, contact
  beside the body, volleying down at feet from below net height (net errors).
- BANDEJA: the position-keeping overhead. Side-on shoulder turn as the lob goes
  up, move back BEHIND the ball's drop point with crossover steps, racquet set
  high early ("paint the wall"), contact at shoulder-to-eye height slightly in
  front, flat-to-slice trajectory landing deep near the opponents' back glass,
  land on the outside leg and recover forward. The goal is to KEEP the net, not
  to win the point. Faults: backpedalling square-on (falling backwards at
  contact), racquet starting low, contact behind the head (ball floats short =
  free counter), trying to hit winners with it, admiring the shot instead of
  recovering forward.
- VÍBORA: aggressive cousin of the bandeja for higher, more attackable lobs —
  faster arm, contact slightly lower and more to the side, wrist pronation adds
  side-spin so the ball skids low off the side glass. Only worth coaching once
  the bandeja is stable. Faults: using it on deep defensive lobs (errors), all
  wrist and no legs, telegraphing by dropping the elbow.
- SMASH FAMILY: flat smash "por 4" (bounce out over the back glass) needs a
  short mid-court ball and full body extension; "por 3" goes out the side. The
  rulo/topspin smash kicks off the back glass. At club level the highest-value
  smash is often the SAFE one: deep, at the body, keeping net position. Faults:
  smashing deep lobs (should be bandeja), jumping without need, smashing at the
  strongest opponent, no plan for the rebound if it comes back.
- LOB (GLOBO): the most important tactical shot in padel. Open racquet face,
  long smooth push from under the ball, height AND depth — target the back
  third, ideally over the backhand shoulder. A lob landing 1m from the glass is
  unattackable; a short lob is a gifted smash. Use it to flip court position:
  good lob → both players advance together. Faults: lobbing flat and short,
  lobbing from a good attacking ball (wasted), never lobbing at all.
- CHIQUITA: soft, low ball from mid/back court at the incoming or established
  net player's FEET, forcing an upward defensive volley you can attack; played
  with slice, margin over the net, dipping. Faults: hitting it too hard (becomes
  a rally ball at hip height), using it from a defensive position.
- BACK-GLASS DEFENCE: turn early, let the ball pass, track it OFF the glass with
  small adjustment steps, contact after the rebound at a comfortable distance,
  reset with a deep drive or lob. Side-glass and double-glass (corner) balls
  need earlier shoulder turn and more patience — the double glass "holds" the
  ball longer than players expect. Faults: swinging before the wall, jamming
  yourself against the glass, panicking on corners, always going cross-court.
- TRANSITION ZONE (mid-court): nobody should LIVE there, but everyone must pass
  through it. Move up behind a deep ball or lob; if caught there, split-step and
  play a controlled low ball or volley deep, then keep advancing. Faults:
  camping in no-man's-land, running through the zone while the opponent hits.

=== POSITIONING & MOVEMENT PRINCIPLES ===
- Move as a unit: side by side, both up or both back; the diagonal drifts
  together toward the ball side. One-up-one-back leaves the fatal middle gap.
- Net position: ~2.5-3m from the net, adjusting with the ball; close in when
  your team plays deep/attacking balls, back off half a step for lobs.
- Defensive position: both players roughly a racquet's length from the back
  glass, NOT pinned against it — leave room for the rebound.
- Cover the middle first: most club-level winners go through the centre gap
  ("who's ball?"). The player on the diagonal of the ball owns the middle.
- After every shot, ask: did that ball earn us the net, keep the net, or lose
  it? Position accordingly, together.

=== TACTICAL PLAYBOOK ===
- The net wins: club statistics and pro play agree — the team at the net wins
  the clear majority of points. Every tactical choice serves taking, keeping,
  or retaking the net.
- Point construction from the back: be patient; drive low at feet or chiquita
  to force a weak volley, or lob to eject the net team. Do not try to hit
  winners from behind the service line — build, then advance.
- Serve tactics: serve to the glass on the deuce side to drag the returner
  wide; serve to the T/body to jam; first volley DEEP, then close the net.
- Defending the smash: read the smasher's shape early; against a bandeja stay
  home and counter-lob deep; against a flat smash from short, one player covers
  the rebound off the back glass, partner covers the fence side.
- Targeting: play the weaker opponent relentlessly on big points; attack the
  feet of the net players; use the middle to create confusion and open the
  angles; only go for glass-side winners when pulled wide balls open naturally.
- Momentum & percentages: after two unforced errors on a shot, take pace off
  and raise margin; on game points play your highest-percentage pattern, not
  your flashiest.

=== COMMON ERRORS → LIKELY CAUSE → CORRECTION ===
- Volleys into the net → contact below net height or beside the body → take the
  ball earlier and out in front; punch, don't swing.
- Bandeja floats short / sits up → contact behind the head, no shoulder turn →
  turn side-on immediately, set the racquet high, move BEHIND the drop point.
- Smashed lobs keep coming back → smashing from too deep → switch to bandeja,
  keep position, wait for the shorter lob.
- Losing every net exchange → too far from the net or racquet low → hold 2.5-3m,
  racquet up, split-step on their contact.
- Beaten by the back glass → swinging before the rebound → say "bounce-glass-
  hit" out loud: let it pass, then play.
- Constant errors from the back → trying winners from defence → 80% of balls
  from the back are lobs or low resets; win the net first.
- Team keeps getting lobbed → net position too tight, no communication → deepest
  player calls "mine/yours", both retreat together, bandeja to reset.

=== DRILL LIBRARY (assign by fix, with progressions) ===
- Shadow bandeja ladder: 3x10 slow-motion bandejas focusing on turn-set-step;
  progress to drop-feed, then to live lobs, then to lob→bandeja→volley pattern.
- Wall rally patience: solo against the back glass — bounce, glass, controlled
  drive; 20 in a row before adding pace; progress to side-glass then corners.
- Chiquita target zone: place a towel 1m past the service line at the net
  player's feet; 10 chiquitas onto it from mid-court; progress to doing it off
  a moving feed, then inside a rally on coach's call.
- Volley depth game: pairs at net vs back, net pair scores only if their volley
  lands past the service line; first to 10; progress by allowing lobs.
- Lob-and-advance: from defence, lob deep; both players advance and must touch
  the service line before the opponent's reply; play out the point; progress by
  requiring the first ball at the net to be a bandeja.
- Split-step metronome: feeder varies pace randomly; player must audibly land a
  split-step on every feed; 2 minutes on, 1 off, 3 rounds.
- Serve + first volley: serve, close, play the first volley DEEP cross-court,
  then play out the point; score doubles if the point is won at the net.
- Middle-ball communication: coach feeds only down the centre; the diagonal
  player must call and take it; errors reset the count; 15 clean in a row.

=== COACHING PRINCIPLES ===
- Diagnose the CAUSE, not the symptom (a netted volley is usually feet/contact
  point, not "bad volley").
- Prioritise ruthlessly: the 1-3 changes with the biggest point-swing for THIS
  player's level. A list of ten fixes fixes nothing.
- Every correction comes with the WHY (points won/lost) and a drill to train it.
- Evidence first: tie advice to what actually happened; never generic filler.
- Be encouraging and honest: name real strengths specifically — players trust
  criticism more when the praise is earned.
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
  /**
   * Set when the validity gate failed: the footage isn't reviewable padel
   * (wrong sport, empty court, unusably short). The caller should return the
   * player's credit instead of delivering a normal review.
   */
  rejectedReason?: string;
};

export type AiReviewInput = {
  video: { kind: "url"; url: string } | { kind: "file"; path: string };
  title: string;
  notes: string | null;
  /** Human-readable focus shot labels, e.g. ["Bandeja", "Volleys"]. */
  focusShots: string[];
  /** Who the paying player is: what they're wearing in the footage. */
  playerOutfit: string | null;
  /** Human-readable starting position, e.g. "Nearest the camera, left side". */
  playerSide: string | null;
};

const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
};

/**
 * What the model must return; enforced via Gemini's responseSchema.
 *
 * The fields are deliberately ordered as a two-stage analysis: the model must
 * first write an evidence INVENTORY of what actually happened in the footage
 * (and place the player's level), and only then coach off that evidence. This
 * ordering measurably improves specificity — conclusions have to cite the
 * inventory rather than fall back on generic advice.
 */
type AnalysisJson = {
  reviewable: boolean;
  rejectionReason: string;
  identification: string;
  inventory: string;
  level: string;
  summary: string;
  strengths: string[];
  focusFeedback?: { area: string; feedback: string }[];
  improvements: { issue: string; why: string; fix: string }[];
  drills: { name: string; how: string }[];
  comments: { timeSeconds: number; note: string }[];
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reviewable: { type: "BOOLEAN" },
    rejectionReason: { type: "STRING" },
    identification: { type: "STRING" },
    inventory: { type: "STRING" },
    level: { type: "STRING" },
    summary: { type: "STRING" },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    focusFeedback: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          area: { type: "STRING" },
          feedback: { type: "STRING" },
        },
        required: ["area", "feedback"],
      },
    },
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
  // Validity gate, then player identification, then inventory and level,
  // before any coaching: the generation order IS the analysis order.
  propertyOrdering: [
    "reviewable",
    "rejectionReason",
    "identification",
    "inventory",
    "level",
    "summary",
    "strengths",
    "focusFeedback",
    "improvements",
    "drills",
    "comments",
  ],
  required: [
    "reviewable",
    "rejectionReason",
    "identification",
    "inventory",
    "level",
    "summary",
    "strengths",
    "improvements",
    "drills",
    "comments",
  ],
} as const;

/**
 * The who-to-analyse block shared by reviews and pre-scans. Hardened against
 * the classic failure: locking onto a partial outfit match (or the most
 * prominent player) instead of matching shirt + shorts + starting position
 * together by eliminating every player on court.
 */
function whoToAnalyseLines(input: AiReviewInput): string[] {
  if (!input.playerOutfit) return [];
  const where = input.playerSide
    ? ` At the START of the video they are positioned: ${input.playerSide} (positions are as seen on screen from the camera).`
    : "";
  return [
    "",
    "WHO TO ANALYSE — this is critical. There may be up to four players on",
    `court. The paying player — the ONLY one you are analysing — is wearing: ${input.playerOutfit}.${where}`,
    "",
    "IDENTIFY BY ELIMINATION, never by first impression:",
    "1. Freeze on the opening seconds and describe EVERY player you can see:",
    "   their position on screen and their full outfit (shirt AND shorts).",
    "2. Match the target against the FULL description — shirt colour AND",
    "   shorts colour AND starting position must ALL fit. Beware partial and",
    "   INVERTED matches: another player may wear the same colours swapped",
    "   (e.g. a white shirt with black shorts when the target wears a black",
    "   shirt with grey shorts). A partner or opponent being larger in frame,",
    "   closer to the camera, or more active does NOT make them the target.",
    "3. Note distinguishing markers of the confirmed target (hair, cap, shoe",
    "   colour, handedness) and use them to re-verify at EVERY moment you",
    "   analyse or timestamp — players swap sides and cross the camera.",
    "Track ONLY this player. Every observation, strength, improvement, drill",
    "and timestamped note must be about THIS player; mention others only as",
    "context. If you cannot confidently identify them, or the description",
    "matches more than one person, say so explicitly and only analyse the",
    "moments where you are certain — never guess and never silently analyse",
    "a different player.",
    "",
  ];
}

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
  lines.push(...whoToAnalyseLines(input));
  if (input.notes) {
    lines.push(`The player's notes to the coach: "${input.notes}".`);
  }
  if (input.focusShots.length) {
    lines.push(
      `The player asked you to focus especially on: ${input.focusShots.join(", ")}.`
    );
  }
  lines.push(
    "",
    "WORK IN STAGES.",
    "",
    "STAGE 0 — VALIDITY GATE. First confirm this is reviewable padel footage:",
    "an enclosed padel court (glass/mesh walls) with actual play or padel",
    "drills visible, and enough usable footage to coach from. If it is NOT —",
    "wrong sport, no sport at all, an empty court, or footage so short/unclear",
    "that honest coaching is impossible — set reviewable=false and write",
    "rejectionReason: 1-2 friendly sentences addressed to the player saying",
    "what the video actually shows and what to upload instead. In that case",
    "leave every array empty and every other string empty, and STOP — do not",
    "invent padel feedback for non-padel footage. Imperfect-but-usable padel",
    "footage (poor angle, amateur play) IS reviewable — note limitations in",
    "the summary instead of rejecting. If reviewable, set reviewable=true and",
    "rejectionReason to an empty string.",
    "",
    "STAGE 1 — IDENTIFY THE PLAYER. Perform the identify-by-elimination steps",
    "from WHO TO ANALYSE above (describe every player at the start, match the",
    "full description, note distinguishing markers). You will report this in",
    "the identification field so the player can confirm you watched the right",
    "person.",
    "",
    "STAGE 2 — INVENTORY (evidence gathering). Watch the whole video and write",
    "a factual inventory of what happened BEFORE forming any coaching opinion:",
    "roughly how many rallies/points you saw, which shots THIS player actually",
    "hit (serves, returns, volleys, bandejas, smashes, lobs, glass play...) and",
    "how each category tended to end (winner, error, kept the rally neutral),",
    "plus where on court they spent their time. Then place them on the level",
    "ladder (beginner / improver / intermediate / advanced) using the markers",
    "in your knowledge base.",
    "",
    "STAGE 3 — COACH off that evidence. Every conclusion must trace back to",
    "something in your inventory. Calibrate every recommendation to the level",
    "you assessed — fix the highest-impact issues for THAT level, per your",
    "coaching principles.",
    "",
    "Be specific and concrete — refer to actual moments, shots and movement",
    "patterns you can see, never generic advice that could apply to any video.",
    "If the footage is unclear or too short to judge something, say so rather",
    "than guessing. Be encouraging but honest.",
    "",
    "Return JSON with:",
    "- identification: 1-3 sentences to the player confirming exactly who you",
    "  tracked and how you told them apart from the others (e.g. \"I watched",
    "  you — black shirt and grey shorts, starting on the near left — and",
    "  distinguished you from your partner in the white shirt and black",
    "  shorts\"). If no outfit description was provided, describe the player",
    "  you analysed. If you were not fully confident, say so here plainly.",
    "- inventory: your stage-2 inventory, 3-6 sentences, written to the player",
    "  (\"I watched ... you hit roughly ...\"). Factual, no advice yet.",
    "- level: one word — beginner, improver, intermediate or advanced.",
    "- summary: 2-4 sentences on their game and level, addressed to the player.",
    "- strengths: 2-4 things they genuinely do well, each one sentence citing",
    "  where in the footage you saw it.",
    input.focusShots.length
      ? "- focusFeedback: one entry per focus area the player requested (listed" +
        "\n  above): area = the focus area's name, feedback = 2-4 sentences of" +
        "\n  dedicated analysis of THAT area based on what you saw, including what" +
        "\n  to change. If the footage never shows the area, say so in feedback."
      : "- focusFeedback: omit (the player requested no specific focus areas).",
    "- improvements: the 3 to 5 highest-impact things to fix, best first —",
    "  include a 4th or 5th only if the footage clearly supports them. For",
    "  each: issue (short name), why (what you observed — cite the pattern",
    "  from your inventory — and why it costs them points), fix (the concrete",
    "  correction, including what correct technique looks like).",
    "- drills: 2-4 practice drills tailored to those fixes (use your drill",
    "  library, adapted to this player): name + how (2-3 sentences, doable on",
    "  any padel court, with a progression).",
    "- comments: 5-10 timestamped notes pinned to specific moments. timeSeconds",
    "  MUST be within the video's actual duration and point at the exact moment",
    "  the observation is visible. Each note is 1-2 sentences about that moment.",
    "  Spread them across the video and tie them to your improvements where",
    "  possible; include at least one note highlighting something they did WELL.",
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

  if (a.identification?.trim()) {
    parts.push("WHO I WATCHED\n" + a.identification.trim());
  }
  if (a.inventory?.trim()) {
    parts.push("WHAT I SAW\n" + a.inventory.trim());
  }
  if (a.strengths.length) {
    parts.push(
      "WHAT YOU'RE DOING WELL\n" +
        a.strengths.map((s) => `• ${s.trim()}`).join("\n")
    );
  }
  if (a.focusFeedback?.length) {
    parts.push(
      "YOUR FOCUS AREAS\n" +
        a.focusFeedback
          .map((f) => `• ${f.area.trim()}: ${f.feedback.trim()}`)
          .join("\n")
    );
  }
  if (a.improvements.length) {
    parts.push(
      "THE THINGS TO FIX FIRST\n" +
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

  if (analysis.reviewable === false) {
    return {
      content: "",
      comments: [],
      rejectedReason:
        analysis.rejectionReason?.trim() ||
        "This video doesn't appear to show padel play, so it can't be reviewed.",
    };
  }

  return {
    content: formatContent(analysis),
    comments: cleanComments(analysis.comments ?? []),
  };
}

// ---------------------------------------------------------------------------
// Coach co-pilot: AI pre-scan of a submission in a HUMAN coach's queue
// ---------------------------------------------------------------------------

export type AiPrescan = {
  /** Who the AI tracked and how it told them apart — for the coach to verify. */
  identification?: string;
  /** Factual inventory of the footage, written to the coach. */
  inventory: string;
  /** One-word level estimate (beginner/improver/intermediate/advanced). */
  level: string;
  /** Draft timestamped notes the coach can accept, edit or dismiss. */
  suggestions: { id: string; timeSeconds: number; note: string }[];
};

const PRESCAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    identification: { type: "STRING" },
    inventory: { type: "STRING" },
    level: { type: "STRING" },
    suggestions: {
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
  propertyOrdering: ["identification", "inventory", "level", "suggestions"],
  required: ["identification", "inventory", "level", "suggestions"],
} as const;

function buildPrescanPrompt(input: AiReviewInput): string {
  const lines = [
    PADEL_KNOWLEDGE,
    "",
    "TASK: You are the AI assistant of a PROFESSIONAL HUMAN padel coach on a",
    "coaching marketplace. The coach will review this player's video and write",
    "their own feedback; your job is PRIVATE prep material that saves the",
    "coach time. You are not the reviewer — the coach is. Never invent",
    "observations; only report what is clearly visible.",
    "",
    `The player titled the video: "${input.title}".`,
  ];
  lines.push(...whoToAnalyseLines(input));
  if (input.notes) {
    lines.push(`The player's notes to the coach: "${input.notes}".`);
  }
  if (input.focusShots.length) {
    lines.push(
      `The player asked for focus on: ${input.focusShots.join(", ")} — make`,
      "sure your suggestions cover every moment relevant to these."
    );
  }
  lines.push(
    "",
    "Watch the ENTIRE video, then return JSON with:",
    "- identification: 1-2 sentences to the coach: which player you tracked",
    "  and how you told them apart from the others (outfit + position at the",
    "  start + any distinguishing markers). If you were not fully confident,",
    "  say so plainly.",
    "- inventory: 3-6 sentences to the coach: roughly how many rallies/points,",
    "  which shots THIS player hit and how each category tended to end, and",
    "  where they spent their time on court. Factual, no advice.",
    "- level: one word — beginner, improver, intermediate or advanced.",
    "- suggestions: 6-12 draft timestamped notes, spread across the video,",
    "  each pinned to the exact moment (timeSeconds MUST be within the video's",
    "  duration). Write each note in the coach's voice addressed to the player",
    "  (\"Your bandeja contact is behind your head here — set the racquet",
    "  earlier\"), 1-2 sentences, specific to what is visible at that moment.",
    "  Include at least one genuinely positive moment. The coach will accept,",
    "  edit or discard each one.",
    "",
    "Never include contact details, links or social handles."
  );
  return lines.join("\n");
}

/** Deterministic pre-scan for dev/preview environments without an AI key. */
export function demoAiPrescan(): AiPrescan {
  return {
    identification:
      "Demo mode: I'd confirm here exactly which player I tracked and how I told them apart.",
    inventory:
      "⚠ Demo mode (no AI key configured): this is a sample pre-scan — the video was not analysed. I'd normally summarise the rallies, the player's shot mix and outcomes, and where they spent their time on court.",
    level: "improver",
    suggestions: [
      { id: "s1", timeSeconds: 5, note: "Sample suggestion: your ready position drops between shots here — keep the racquet up at chest height." },
      { id: "s2", timeSeconds: 15, note: "Sample suggestion: lovely deep lob — this is exactly the moment to advance to the net with your partner." },
    ],
  };
}

/**
 * Watch the video and produce the coach's private pre-scan. Returns null when
 * no AI key is configured (callers may fall back to the demo pre-scan).
 */
export async function generateAiPrescan(
  input: AiReviewInput
): Promise<AiPrescan | null> {
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
              { text: buildPrescanPrompt(input) },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: PRESCAN_SCHEMA,
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
  if (!text) throw new Error("The model returned no pre-scan.");

  let raw: {
    identification?: string;
    inventory: string;
    level: string;
    suggestions: { timeSeconds: number; note: string }[];
  };
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("The model returned malformed pre-scan JSON.");
  }
  return {
    identification: raw.identification?.trim() || undefined,
    inventory: raw.inventory?.trim() || "No inventory produced.",
    level: raw.level?.trim().toLowerCase() || "unknown",
    suggestions: (raw.suggestions ?? [])
      .filter((s) => Number.isFinite(s.timeSeconds) && s.timeSeconds >= 0 && s.note?.trim())
      .sort((a, b) => a.timeSeconds - b.timeSeconds)
      .slice(0, 15)
      .map((s, i) => ({
        id: `s${i + 1}`,
        timeSeconds: Math.round(s.timeSeconds * 10) / 10,
        note: s.note.trim().slice(0, 1000),
      })),
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
