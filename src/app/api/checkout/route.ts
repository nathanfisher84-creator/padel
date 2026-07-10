import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { appUrl, stripeEnabled } from "@/lib/config";
import { getStripe } from "@/lib/stripe";
import { recordOneOffPayment, recordSubscriptionPayment } from "@/lib/payments";
import { Role } from "@/lib/constants";

const bodySchema = z.object({
  coachId: z.string().min(1),
  plan: z.enum(["one_off", "monthly"]),
});

/**
 * Start a purchase of either a single video review or a monthly plan with a
 * coach. With Stripe configured this returns a Stripe Checkout URL; without
 * keys it runs in demo mode and records the payment immediately so the whole
 * flow can be exercised locally.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }
  if (session.role !== Role.PLAYER) {
    return NextResponse.json(
      { error: "Only player accounts can purchase coaching." },
      { status: 403 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { coachId, plan } = parsed.data;

  const coach = await db.user.findUnique({
    where: { id: coachId },
    include: { coachProfile: true },
  });
  if (!coach?.coachProfile?.isPublished) {
    return NextResponse.json({ error: "Coach not found." }, { status: 404 });
  }
  const profile = coach.coachProfile;
  const amountCents =
    plan === "one_off" ? profile.oneOffPriceCents : profile.monthlyPriceCents;

  if (!stripeEnabled()) {
    // Demo mode: mark the payment as completed right away.
    if (plan === "one_off") {
      await recordOneOffPayment({
        playerId: session.id,
        coachId,
        amountCents,
        currency: profile.currency,
      });
    } else {
      await recordSubscriptionPayment({
        playerId: session.id,
        coachId,
        amountCents,
        currency: profile.currency,
      });
    }
    return NextResponse.json({ url: "/dashboard?purchase=success&demo=1" });
  }

  const stripe = getStripe();
  const checkout = await stripe.checkout.sessions.create({
    mode: plan === "one_off" ? "payment" : "subscription",
    customer_email: session.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: profile.currency.toLowerCase(),
          unit_amount: amountCents,
          ...(plan === "monthly" ? { recurring: { interval: "month" as const } } : {}),
          product_data: {
            name:
              plan === "one_off"
                ? `1 video review by ${coach.name}`
                : `Monthly coaching with ${coach.name}`,
          },
        },
      },
    ],
    metadata: { playerId: session.id, coachId, plan },
    ...(plan === "monthly"
      ? { subscription_data: { metadata: { playerId: session.id, coachId } } }
      : {}),
    success_url: `${appUrl()}/dashboard?purchase=success`,
    cancel_url: `${appUrl()}/coaches/${coachId}?purchase=canceled`,
  });

  return NextResponse.json({ url: checkout.url });
}
