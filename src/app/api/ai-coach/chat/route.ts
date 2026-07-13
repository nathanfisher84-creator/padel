import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { aiCoachEnabled, coachChat } from "@/lib/aiCoach";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .min(1)
    .max(30),
});

/** Send the conversation so far to Nova and get the next coaching reply. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (!aiCoachEnabled()) {
    return NextResponse.json(
      { error: "The AI coach is not available right now." },
      { status: 503 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  // Must end on a user turn.
  if (parsed.data.messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Nothing to answer." }, { status: 400 });
  }

  try {
    const reply = await coachChat(parsed.data.messages);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI coach chat failed:", err);
    return NextResponse.json(
      { error: "Nova couldn't respond just now. Please try again." },
      { status: 502 }
    );
  }
}
