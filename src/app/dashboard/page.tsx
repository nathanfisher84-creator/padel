import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { formatDate, formatMoney } from "@/lib/format";
import {
  PaymentStatus,
  Role,
  SubmissionStatus,
  SubscriptionStatus,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { purchase?: string };
}) {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard");

  return (
    <div>
      {searchParams.purchase === "success" && (
        <div className="mb-6 rounded-lg border border-ball-500/40 bg-ball-500/10 px-4 py-3 text-sm font-medium text-ball-600">
          Payment successful — you can now upload a video for your coach. 🎾
        </div>
      )}
      {session.role === Role.COACH ? (
        <CoachDashboard userId={session.id} />
      ) : session.role === Role.ADMIN ? (
        <AdminDashboard />
      ) : (
        <PlayerDashboard userId={session.id} name={session.name} />
      )}
    </div>
  );
}

async function PlayerDashboard({ userId, name }: { userId: string; name: string }) {
  const [entitlements, submissions, payments] = await Promise.all([
    getEntitlements(userId),
    db.videoSubmission.findMany({
      where: { playerId: userId },
      include: { coach: true, feedback: true },
      orderBy: { createdAt: "desc" },
    }),
    db.payment.findMany({
      where: { playerId: userId, status: PaymentStatus.PAID },
      include: { coach: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Hi {name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-slate-600">Your training hub</p>
        </div>
        <div className="flex gap-3">
          <Link href="/coaches" className="btn-secondary">Find a coach</Link>
          <Link href="/dashboard/upload" className="btn-primary">Upload a video</Link>
        </div>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Available reviews</h2>
        {entitlements.length === 0 ? (
          <div className="card mt-4 text-sm text-slate-500">
            You have no review credits or active plans.{" "}
            <Link href="/coaches" className="font-semibold text-court-600 hover:underline">
              Choose a coach
            </Link>{" "}
            to get started.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entitlements.map((e, i) => (
              <div key={`${e.coachId}-${e.source}-${i}`} className="card">
                <p className="font-semibold">{e.coachName}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {e.source === "credit"
                    ? "1 video review credit"
                    : `${e.remaining} review${e.remaining === 1 ? "" : "s"} left this month`}
                </p>
                <span
                  className={`badge mt-3 ${
                    e.source === "credit"
                      ? "bg-court-100 text-court-800"
                      : "bg-ball-500/20 text-ball-600"
                  }`}
                >
                  {e.source === "credit" ? "One-off" : "Monthly plan"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold">My videos</h2>
        {submissions.length === 0 ? (
          <div className="card mt-4 text-sm text-slate-500">
            No videos yet. Once you have a credit or plan, upload your first video.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {submissions.map((s) => (
              <Link
                key={s.id}
                href={`/submissions/${s.id}`}
                className="card flex items-center justify-between gap-4 !py-4 transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.title}</p>
                  <p className="text-sm text-slate-500">
                    Coach {s.coach.name} · {formatDate(s.createdAt)}
                  </p>
                </div>
                <span
                  className={`badge shrink-0 ${
                    s.status === SubmissionStatus.REVIEWED
                      ? "bg-ball-500/20 text-ball-600"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {s.status === SubmissionStatus.REVIEWED
                    ? "Feedback ready"
                    : "Awaiting feedback"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {payments.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Recent payments</h2>
          <div className="card mt-4 overflow-x-auto !p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Coach</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">{p.coach.name}</td>
                    <td className="px-4 py-3">
                      {p.kind === "ONE_OFF" ? "Video review" : "Monthly plan"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(p.amountCents, p.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

async function CoachDashboard({ userId }: { userId: string }) {
  const [queue, reviewed, earnings, activeSubs] = await Promise.all([
    db.videoSubmission.findMany({
      where: { coachId: userId, status: SubmissionStatus.AWAITING_FEEDBACK },
      include: { player: true },
      orderBy: { createdAt: "asc" },
    }),
    db.videoSubmission.findMany({
      where: { coachId: userId, status: SubmissionStatus.REVIEWED },
      include: { player: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    db.payment.aggregate({
      where: { coachId: userId, status: PaymentStatus.PAID },
      _sum: { coachCents: true, amountCents: true },
      _count: true,
    }),
    db.subscription.count({
      where: {
        coachId: userId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { gt: new Date() },
      },
    }),
  ]);

  const profile = await db.coachProfile.findUnique({ where: { userId } });
  const currency = profile?.currency ?? "EUR";

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Coach dashboard</h1>
          <p className="mt-1 text-slate-600">
            Review incoming videos and track your earnings
          </p>
        </div>
        <Link href="/dashboard/profile" className="btn-secondary">
          Edit my profile
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-500">Your earnings (after platform fee)</p>
          <p className="mt-1 text-3xl font-extrabold text-court-700">
            {formatMoney(earnings._sum.coachCents ?? 0, currency)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Active subscribers</p>
          <p className="mt-1 text-3xl font-extrabold text-court-700">{activeSubs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Videos awaiting your feedback</p>
          <p className="mt-1 text-3xl font-extrabold text-court-700">{queue.length}</p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Review queue</h2>
        {queue.length === 0 ? (
          <div className="card mt-4 text-sm text-slate-500">
            All caught up — no videos waiting for feedback. 🏆
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {queue.map((s) => (
              <Link
                key={s.id}
                href={`/submissions/${s.id}`}
                className="card flex items-center justify-between gap-4 !py-4 transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.title}</p>
                  <p className="text-sm text-slate-500">
                    From {s.player.name} · {formatDate(s.createdAt)}
                  </p>
                </div>
                <span className="btn-primary !px-4 !py-2 text-sm">Review now</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {reviewed.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">Recently reviewed</h2>
          <div className="mt-4 space-y-3">
            {reviewed.map((s) => (
              <Link
                key={s.id}
                href={`/submissions/${s.id}`}
                className="card flex items-center justify-between gap-4 !py-4 transition hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.title}</p>
                  <p className="text-sm text-slate-500">From {s.player.name}</p>
                </div>
                <span className="badge bg-ball-500/20 text-ball-600">Reviewed</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function AdminDashboard() {
  const totals = await db.payment.aggregate({
    where: { status: PaymentStatus.PAID },
    _sum: { amountCents: true, platformFeeCents: true, coachCents: true },
    _count: true,
  });
  const [coachCount, playerCount, submissionCount] = await Promise.all([
    db.coachProfile.count(),
    db.user.count({ where: { role: Role.PLAYER } }),
    db.videoSubmission.count(),
  ]);
  const recent = await db.payment.findMany({
    where: { status: PaymentStatus.PAID },
    include: { coach: true, player: true },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Platform overview</h1>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Gross revenue", formatMoney(totals._sum.amountCents ?? 0, "EUR")],
          ["Platform earnings", formatMoney(totals._sum.platformFeeCents ?? 0, "EUR")],
          ["Paid to coaches", formatMoney(totals._sum.coachCents ?? 0, "EUR")],
          ["Payments", String(totals._count)],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-court-700">{value}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Coaches", coachCount],
          ["Players", playerCount],
          ["Video submissions", submissionCount],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Recent payments</h2>
        <div className="card mt-4 overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Coach</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Platform fee</th>
                <th className="px-4 py-3 text-right">Coach share</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">{p.player.name}</td>
                  <td className="px-4 py-3">{p.coach.name}</td>
                  <td className="px-4 py-3">
                    {p.kind === "ONE_OFF" ? "Video review" : "Subscription"}
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(p.amountCents, p.currency)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(p.platformFeeCents, p.currency)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(p.coachCents, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
