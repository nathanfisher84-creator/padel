import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { recordOneOffPayment, recordSubscriptionPayment } from "@/lib/payments";

// Stripe webhook: fulfils checkouts and subscription renewals.
// Configure the endpoint in the Stripe dashboard pointing at
//   {APP_URL}/api/stripe/webhook
// and set STRIPE_WEBHOOK_SECRET to the endpoint's signing secret.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { playerId, coachId, plan } = session.metadata ?? {};
    if (playerId && coachId) {
      if (plan === "one_off") {
        await recordOneOffPayment({
          playerId,
          coachId,
          amountCents: session.amount_total ?? 0,
          currency: (session.currency ?? "eur").toUpperCase(),
          stripeRef: session.id,
        });
      } else if (plan === "monthly") {
        await recordSubscriptionPayment({
          playerId,
          coachId,
          amountCents: session.amount_total ?? 0,
          currency: (session.currency ?? "eur").toUpperCase(),
          stripeRef: session.id,
          stripeSubId:
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id,
        });
      }
    }
  }

  // Monthly renewals arrive as invoice payments on the subscription.
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subRef = invoice.parent?.subscription_details?.subscription;
    // Skip the first invoice; checkout.session.completed already handled it.
    if (invoice.billing_reason === "subscription_cycle" && subRef) {
      const subId = typeof subRef === "string" ? subRef : subRef.id;
      const stripeSub = await getStripe().subscriptions.retrieve(subId);
      const { playerId, coachId } = stripeSub.metadata ?? {};
      if (playerId && coachId) {
        await recordSubscriptionPayment({
          playerId,
          coachId,
          amountCents: invoice.amount_paid,
          currency: invoice.currency.toUpperCase(),
          stripeRef: invoice.id,
          stripeSubId: subId,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
