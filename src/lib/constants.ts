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
