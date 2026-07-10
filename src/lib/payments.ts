import { db } from "@/lib/db";
import { splitRevenue } from "@/lib/config";
import {
  PaymentKind,
  PaymentStatus,
  SubscriptionStatus,
} from "@/lib/constants";

/**
 * Record a successful one-off review purchase. Creates a PAID payment row
 * carrying the platform/coach revenue split; the payment acts as one video
 * review credit until a submission is attached to it.
 */
export async function recordOneOffPayment(opts: {
  playerId: string;
  coachId: string;
  amountCents: number;
  currency: string;
  stripeRef?: string;
}) {
  const { platformFeeCents, coachCents } = splitRevenue(opts.amountCents);
  return db.payment.create({
    data: {
      playerId: opts.playerId,
      coachId: opts.coachId,
      kind: PaymentKind.ONE_OFF,
      amountCents: opts.amountCents,
      platformFeeCents,
      coachCents,
      currency: opts.currency,
      status: PaymentStatus.PAID,
      stripeRef: opts.stripeRef,
    },
  });
}

/**
 * Record a successful monthly subscription payment: upserts the subscription
 * (extending the period by one month) and logs the revenue-split payment.
 */
export async function recordSubscriptionPayment(opts: {
  playerId: string;
  coachId: string;
  amountCents: number;
  currency: string;
  stripeRef?: string;
  stripeSubId?: string;
}) {
  const { platformFeeCents, coachCents } = splitRevenue(opts.amountCents);
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await db.subscription.upsert({
    where: {
      playerId_coachId: { playerId: opts.playerId, coachId: opts.coachId },
    },
    update: {
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
      stripeSubId: opts.stripeSubId,
    },
    create: {
      playerId: opts.playerId,
      coachId: opts.coachId,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: periodEnd,
      stripeSubId: opts.stripeSubId,
    },
  });

  await db.payment.create({
    data: {
      playerId: opts.playerId,
      coachId: opts.coachId,
      kind: PaymentKind.SUBSCRIPTION_CYCLE,
      amountCents: opts.amountCents,
      platformFeeCents,
      coachCents,
      currency: opts.currency,
      status: PaymentStatus.PAID,
      stripeRef: opts.stripeRef,
      subscriptionId: subscription.id,
    },
  });

  return subscription;
}
