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

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}
