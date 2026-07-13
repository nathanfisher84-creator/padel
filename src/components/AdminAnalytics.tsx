import { db } from "@/lib/db";
import { PaymentStatus, Role } from "@/lib/constants";
import { formatMoney } from "@/lib/format";

const DAYS = 14;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The last N day-keys, oldest first, plus short labels like "Mon 7". */
function dayBuckets(): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({
      key: dayKey(d),
      label: new Intl.DateTimeFormat("en", {
        weekday: "short",
        day: "numeric",
      }).format(d),
    });
  }
  return out;
}

function bucketize(dates: Date[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of dates) {
    const k = dayKey(d);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** Server-rendered mini bar chart — no client JS, tooltips via title. */
function MiniBars({
  buckets,
  values,
  color,
}: {
  buckets: { key: string; label: string }[];
  values: Map<string, number>;
  color: string;
}) {
  const max = Math.max(1, ...buckets.map((b) => values.get(b.key) ?? 0));
  return (
    <div className="mt-3 flex h-16 items-end gap-1">
      {buckets.map((b) => {
        const v = values.get(b.key) ?? 0;
        return (
          <div
            key={b.key}
            title={`${b.label}: ${v}`}
            className="flex h-full flex-1 items-end"
          >
            <div
              className={`w-full rounded-t ${v > 0 ? color : "bg-slate-100"}`}
              style={{ height: `${v > 0 ? Math.max(10, (v / max) * 100) : 6}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Owner analytics for the admin dashboard: 14-day activity charts, AI usage,
 * promo tracking and a signup→review funnel — all straight from the app DB.
 */
export async function AdminAnalytics() {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));
  since.setUTCHours(0, 0, 0, 0);

  const [signups, uploads, paidPayments, promoPayments, aiChat14d, aiChatTotal, aiReviews, playersWithUpload, playersWithFeedback] =
    await Promise.all([
      db.user.findMany({
        where: { createdAt: { gte: since }, role: { in: [Role.PLAYER, Role.COACH] } },
        select: { createdAt: true },
      }),
      db.videoSubmission.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      db.payment.findMany({
        where: { status: PaymentStatus.PAID, amountCents: { gt: 0 } },
        select: { createdAt: true, amountCents: true, currency: true },
      }),
      db.payment.findMany({
        where: { stripeRef: { startsWith: "promo:" } },
        select: { playerId: true, submission: { select: { id: true } } },
      }),
      db.aiChatMessage.count({ where: { createdAt: { gte: since } } }),
      db.aiChatMessage.count(),
      db.feedback.count({
        where: { submission: { coach: { coachProfile: { is: { isAi: true } } } } },
      }),
      db.videoSubmission.groupBy({ by: ["playerId"] }),
      db.feedback.findMany({
        select: { submission: { select: { playerId: true } } },
      }),
    ]);

  const buckets = dayBuckets();
  const signupsByDay = bucketize(signups.map((u) => u.createdAt));
  const uploadsByDay = bucketize(uploads.map((u) => u.createdAt));
  const revenue14d = paidPayments.filter((p) => p.createdAt >= since);
  const revenueByDay = new Map<string, number>();
  for (const p of revenue14d) {
    const k = dayKey(p.createdAt);
    revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + p.amountCents);
  }
  // Render revenue bars as whole currency units, scaled the same way.
  const revenueBars = new Map<string, number>();
  revenueByDay.forEach((cents, k) => revenueBars.set(k, Math.round(cents / 100)));
  const revenue14dTotal = revenue14d.reduce((s, p) => s + p.amountCents, 0);
  const revenueCurrency = revenue14d[0]?.currency ?? "AED";

  const promoTesters = new Set(promoPayments.map((p) => p.playerId)).size;
  const promoUsed = promoPayments.filter((p) => p.submission).length;

  const totalPlayers = await db.user.count({ where: { role: Role.PLAYER } });
  const uploaded = playersWithUpload.length;
  const gotFeedback = new Set(aiReviewsSafe(playersWithFeedback)).size;

  return (
    <section>
      <h2 className="text-xl font-semibold">Analytics — last {DAYS} days</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="card !py-4">
          <p className="text-sm text-slate-600">
            Signups <span className="text-xs text-slate-400">({signups.length})</span>
          </p>
          <MiniBars buckets={buckets} values={signupsByDay} color="bg-court-500" />
        </div>
        <div className="card !py-4">
          <p className="text-sm text-slate-600">
            Video uploads <span className="text-xs text-slate-400">({uploads.length})</span>
          </p>
          <MiniBars buckets={buckets} values={uploadsByDay} color="bg-ball-500" />
        </div>
        <div className="card !py-4">
          <p className="text-sm text-slate-600">
            Revenue{" "}
            <span className="text-xs text-slate-400">
              ({formatMoney(revenue14dTotal, revenueCurrency)})
            </span>
          </p>
          <MiniBars buckets={buckets} values={revenueBars} color="bg-emerald-500" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        {[
          ["Promo testers", promoTesters, "players who redeemed NOVAFREE"],
          ["Promo reviews used", `${promoUsed} / ${promoPayments.length}`, "credits spent vs granted"],
          ["AI reviews delivered", aiReviews, "all time"],
          ["AI chat messages", `${aiChat14d} / ${aiChatTotal}`, `last ${DAYS}d / all time`],
        ].map(([label, value, hint]) => (
          <div key={String(label)} className="card !py-4">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-court-700">{value}</p>
            <p className="text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4 !py-4">
        <p className="text-sm font-semibold text-slate-700">Player funnel (all time)</p>
        <div className="stat mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span>
            <span className="font-bold text-court-700">{totalPlayers}</span> players
          </span>
          <span aria-hidden>→</span>
          <span>
            <span className="font-bold text-court-700">{promoTesters}</span> redeemed promo
          </span>
          <span aria-hidden>→</span>
          <span>
            <span className="font-bold text-court-700">{uploaded}</span> uploaded a video
          </span>
          <span aria-hidden>→</span>
          <span>
            <span className="font-bold text-court-700">{gotFeedback}</span> received feedback
          </span>
        </div>
      </div>
    </section>
  );
}

function aiReviewsSafe(
  rows: { submission: { playerId: string } | null }[]
): string[] {
  return rows
    .filter((r): r is { submission: { playerId: string } } => Boolean(r.submission))
    .map((r) => r.submission.playerId);
}
