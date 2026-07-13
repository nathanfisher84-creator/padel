import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aiPromoCode, aiPromoReviewCount } from "@/lib/config";
import { Role, PaymentKind, PaymentStatus } from "@/lib/constants";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
});

/**
 * Redeem the testing-phase promo code for a batch of free AI video reviews
 * (aiPromoReviewCount, default 20).
 *
 * Each credit is a zero-amount PAID one-off payment to the AI coach, so it
 * flows through the normal entitlement machinery (upload picker, credit
 * consumption, dashboards) with no special cases. Credit i carries the unique
 * stripeRef `promo:<CODE>:<playerId>[:i]`, so re-applying the code never
 * duplicates credits — it only tops a player up to the full batch (which also
 * upgrades players who redeemed back when the code granted a single review).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (session.role !== Role.PLAYER) {
    return NextResponse.json(
      { error: "Promo codes are for player accounts." },
      { status: 403 }
    );
  }

  const activeCode = aiPromoCode();
  if (!activeCode) {
    return NextResponse.json(
      { error: "Promo codes are not active right now." },
      { status: 404 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || parsed.data.code.trim().toUpperCase() !== activeCode) {
    return NextResponse.json(
      { error: "That code isn't valid." },
      { status: 400 }
    );
  }

  const aiCoach = await db.coachProfile.findFirst({
    where: { isAi: true, isPublished: true },
    select: { userId: true, currency: true },
  });
  if (!aiCoach) {
    return NextResponse.json(
      { error: "The AI coach isn't available right now." },
      { status: 503 }
    );
  }

  let granted = 0;
  for (let i = 1; i <= aiPromoReviewCount(); i++) {
    // Credit 1 keeps the legacy suffix-less ref so earlier single-credit
    // redemptions are recognised rather than duplicated.
    const ref =
      i === 1
        ? `promo:${activeCode}:${session.id}`
        : `promo:${activeCode}:${session.id}:${i}`;
    try {
      await db.payment.create({
        data: {
          playerId: session.id,
          coachId: aiCoach.userId,
          kind: PaymentKind.ONE_OFF,
          amountCents: 0,
          platformFeeCents: 0,
          coachCents: 0,
          currency: aiCoach.currency,
          status: PaymentStatus.PAID,
          stripeRef: ref,
        },
      });
      granted++;
    } catch (err) {
      // Unique stripeRef: this credit already exists — skip, keep going.
      if ((err as { code?: string })?.code !== "P2002") throw err;
    }
  }

  if (granted === 0) {
    return NextResponse.json(
      { error: "You've already used this code — check your dashboard for the credits." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, granted });
}
