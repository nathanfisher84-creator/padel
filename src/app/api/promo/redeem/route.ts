import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { aiPromoCode } from "@/lib/config";
import { Role, PaymentKind, PaymentStatus } from "@/lib/constants";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(40),
});

/**
 * Redeem the testing-phase promo code for one free AI video review.
 *
 * A redemption is recorded as a zero-amount PAID one-off payment to the AI
 * coach, so it flows through the normal entitlement machinery (upload picker,
 * credit consumption, dashboards) with no special cases. The unique stripeRef
 * `promo:<CODE>:<playerId>` makes it one redemption per player per code.
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
        stripeRef: `promo:${activeCode}:${session.id}`,
      },
    });
  } catch (err) {
    // Unique stripeRef: this player already redeemed this code.
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "You've already used this code — check your dashboard for the credit." },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
