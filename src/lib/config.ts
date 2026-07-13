// Platform-level configuration, driven by environment variables.

/** Percentage of every payment kept by the platform owner (0-100). */
export function platformFeePercent(): number {
  const raw = Number(process.env.PLATFORM_FEE_PERCENT ?? "20");
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return 20;
  return raw;
}

/** Split an amount into the platform fee and the coach's share. */
export function splitRevenue(amountCents: number): {
  platformFeeCents: number;
  coachCents: number;
} {
  const platformFeeCents = Math.round((amountCents * platformFeePercent()) / 100);
  return { platformFeeCents, coachCents: amountCents - platformFeeCents };
}

/** Stripe is optional: without keys the app runs in demo-payment mode. */
export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Demo payment mode marks purchases PAID instantly with no real charge — for
 * local development and (opt-in) previews only. It must never grant free
 * credits on a production deployment unless explicitly enabled with
 * ALLOW_DEMO_PAYMENTS=true.
 */
export function demoPaymentsAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_DEMO_PAYMENTS === "true";
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/** How many free AI video reviews one promo redemption grants. */
export function aiPromoReviewCount(): number {
  const raw = Number(process.env.AI_PROMO_REVIEWS ?? "20");
  if (!Number.isInteger(raw) || raw < 1 || raw > 100) return 20;
  return raw;
}

/**
 * Testing-phase promo code: redeeming it grants aiPromoReviewCount() free AI
 * video reviews (zero-amount credits). Override with AI_PROMO_CODE to rotate
 * the code, or set AI_PROMO_CODE=off to disable redemptions entirely.
 */
export function aiPromoCode(): string | null {
  const raw = (process.env.AI_PROMO_CODE ?? "NOVAFREE").trim().toUpperCase();
  if (!raw || raw === "OFF") return null;
  return raw;
}
