// Review-deadline arithmetic for a coach's committed turnaround. Shared by
// the coach dashboard (countdown badges), the reminder cron and emails so
// every surface agrees on when a review is due.

export type DeadlineState = "ok" | "soon" | "overdue";

export type DeadlineInfo = {
  dueAt: Date;
  state: DeadlineState;
  /** Positive = time left; negative = hours past the deadline. */
  hoursLeft: number;
  /** Human label, e.g. "Due in 14h", "Due in 3d", "Overdue by 6h". */
  label: string;
};

/** When feedback is due for a submission, given the coach's commitment. */
export function reviewDueAt(createdAt: Date, turnaroundHours: number): Date {
  return new Date(createdAt.getTime() + turnaroundHours * 3_600_000);
}

/** Fraction of the window after which the "due soon" nudge fires (75%). */
export const SOON_THRESHOLD = 0.75;

function span(hours: number): string {
  const h = Math.max(1, Math.round(hours));
  return h >= 48 ? `${Math.round(h / 24)}d` : `${h}h`;
}

export function deadlineInfo(
  createdAt: Date,
  turnaroundHours: number,
  now: Date = new Date()
): DeadlineInfo {
  const dueAt = reviewDueAt(createdAt, turnaroundHours);
  const hoursLeft = (dueAt.getTime() - now.getTime()) / 3_600_000;
  const elapsedFraction =
    (now.getTime() - createdAt.getTime()) / (turnaroundHours * 3_600_000);

  if (hoursLeft < 0) {
    return {
      dueAt,
      state: "overdue",
      hoursLeft,
      label: `Overdue by ${span(-hoursLeft)}`,
    };
  }
  return {
    dueAt,
    state: elapsedFraction >= SOON_THRESHOLD ? "soon" : "ok",
    hoursLeft,
    label: `Due in ${span(hoursLeft)}`,
  };
}

/** "Tue 15 Jul, 14:00" — used in coach emails. */
export function formatDueAt(dueAt: Date): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Dubai",
  }).format(dueAt);
}
