import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/** Lazily construct the Stripe client; only call when stripeEnabled(). */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key); // uses the SDK's pinned API version
  }
  return stripeClient;
}
