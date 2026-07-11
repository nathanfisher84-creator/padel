// String constants for fields that would be enums on Postgres/MySQL
// (SQLite does not support Prisma enums).

export const Role = {
  PLAYER: "PLAYER",
  COACH: "COACH",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  CANCELED: "CANCELED",
} as const;

export const PaymentKind = {
  ONE_OFF: "ONE_OFF",
  SUBSCRIPTION_CYCLE: "SUBSCRIPTION_CYCLE",
} as const;

export const PaymentStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;

export const SubmissionStatus = {
  AWAITING_FEEDBACK: "AWAITING_FEEDBACK",
  REVIEWED: "REVIEWED",
} as const;

export const CURRENCIES = ["EUR", "USD", "GBP"] as const;

// The named shots a player can ask a coach to focus on — the product
// language of padel analysis.
export const FOCUS_SHOTS = [
  { key: "bandeja", label: "Bandeja" },
  { key: "vibora", label: "Víbora" },
  { key: "smash", label: "Smash" },
  { key: "serve", label: "Serve" },
  { key: "return", label: "Return of serve" },
  { key: "volley", label: "Volleys" },
  { key: "lob", label: "Lob" },
  { key: "back-glass", label: "Back-glass exits" },
  { key: "side-glass", label: "Side-glass exits" },
  { key: "chiquita", label: "Chiquita" },
  { key: "transition", label: "Net transition" },
  { key: "positioning", label: "Court positioning" },
] as const;
export const FOCUS_SHOT_KEYS = FOCUS_SHOTS.map((s) => s.key);

// Response times a coach can commit to.
export const TURNAROUND_OPTIONS = [
  { hours: 24, label: "24 hours" },
  { hours: 48, label: "48 hours" },
  { hours: 72, label: "72 hours" },
  { hours: 168, label: "7 days" },
] as const;
export const TURNAROUND_HOURS = TURNAROUND_OPTIONS.map((o) => o.hours);

export function turnaroundLabel(hours: number): string {
  return hours >= 48 ? `${Math.round(hours / 24)} days` : `${hours}h`;
}
