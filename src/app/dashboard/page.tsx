import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import { ApproveCoachButton } from "@/components/ApproveCoachButton";
import { CoachAgreementPrompt } from "@/components/CoachAgreementPrompt";
import { FoundingCoachButton } from "@/components/FoundingCoachButton";
import { COACH_AGREEMENT_VERSION } from "@/lib/coachAgreement";
import { platformFeePercent } from "@/lib/config";
import { ViewAsButton } from "@/components/ViewAsButton";
import { getSession } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { deadlineInfo } from "@/lib/deadlines";
import { formatDate, formatMoney } from "@/lib/format";
import {
  PaymentStatus,
  Role,
  SubmissionStatus,
  SubscriptionStatus,
  turnaroundLabel,
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
          <div className="card mt-4 text-sm text-slate-600">
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
          <div className="card mt-4 text-sm text-slate-600">
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
                  <p className="text-sm text-slate-600">
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
              <thead className="border-b border-slate-200 text-left text-slate-600">
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
  const currency = profile?.currency ?? "AED";
  const turnaround = profile?.turnaroundHours ?? 72;

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

      {profile &&
        !profile.isAi &&
        profile.agreementVersion !== COACH_AGREEMENT_VERSION && (
          <CoachAgreementPrompt />
        )}

      {profile && !profile.isPublished && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <span className="font-semibold">Your profile is being reviewed.</span>{" "}
          Our team checks every coach before they go live — you&apos;ll appear
          in the directory as soon as you&apos;re approved. You can keep
          polishing your profile in the meantime.
        </div>
      )}

      {/* Coach terms — shown only here, after full sign-up */}
      {(() => {
        const fee = profile?.feePercentOverride ?? platformFeePercent();
        return (
          <div className="rounded-xl border border-court-200 bg-court-50 px-5 py-4 text-sm text-court-900">
            <span className="font-semibold">
              You set your own rates and keep {100 - fee}% of every payment.
            </span>{" "}
            {profile?.isFounding ? (
              <>
                As a{" "}
                <span className="font-semibold text-amber-700">
                  founding coach
                </span>{" "}
                you&apos;re on a promotional {fee}% platform fee.
              </>
            ) : (
              <>The {fee}% platform fee is deducted automatically.</>
            )}{" "}
            The earnings shown below are yours. Change your rates any time from{" "}
            <Link
              href="/dashboard/profile"
              className="font-semibold text-court-700 underline"
            >
              your profile
            </Link>
            .
          </div>
        );
      })()}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <p className="text-sm text-slate-600">Your earnings (after platform fee)</p>
          <p className="mt-1 text-3xl font-extrabold text-court-700">
            {formatMoney(earnings._sum.coachCents ?? 0, currency)}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-600">Active subscribers</p>
          <p className="mt-1 text-3xl font-extrabold text-court-700">{activeSubs}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-600">Videos awaiting your feedback</p>
          <p className="mt-1 text-3xl font-extrabold text-court-700">{queue.length}</p>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-semibold">Review queue</h2>
          <p className="text-xs text-slate-500">
            Your committed response time: {turnaroundLabel(turnaround)}
          </p>
        </div>
        {queue.length === 0 ? (
          <div className="card mt-4 text-sm text-slate-600">
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
                  <p className="text-sm text-slate-600">
                    From {s.player.name} · {formatDate(s.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {(() => {
                    const d = deadlineInfo(s.createdAt, turnaround);
                    return (
                      <span
                        className={`badge ${
                          d.state === "overdue"
                            ? "bg-red-100 text-red-700"
                            : d.state === "soon"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-court-100 text-court-800"
                        }`}
                      >
                        {d.label}
                      </span>
                    );
                  })()}
                  <span className="btn-primary !px-4 !py-2 text-sm">Review now</span>
                </div>
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
                  <p className="text-sm text-slate-600">From {s.player.name}</p>
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
  // Group revenue by currency — never sum different currencies into one total.
  const byCurrency = await db.payment.groupBy({
    by: ["currency"],
    where: { status: PaymentStatus.PAID },
    _sum: { amountCents: true, platformFeeCents: true, coachCents: true },
    _count: true,
  });
  const revenueRows = byCurrency.length
    ? byCurrency
    : [
        {
          currency: "AED",
          _sum: { amountCents: 0, platformFeeCents: 0, coachCents: 0 },
          _count: 0,
        },
      ];
  const [coachCount, playerCount, submissionCount, waiting] = await Promise.all([
    db.coachProfile.count(),
    db.user.count({ where: { role: Role.PLAYER } }),
    db.videoSubmission.count(),
    // Open human-coach reviews, to compute how many are past the coach's
    // committed turnaround (per-coach windows, so filtered in JS).
    db.videoSubmission.findMany({
      where: {
        status: SubmissionStatus.AWAITING_FEEDBACK,
        coach: { coachProfile: { is: { isAi: false } } },
      },
      select: {
        createdAt: true,
        coach: { select: { coachProfile: { select: { turnaroundHours: true } } } },
      },
    }),
  ]);
  const overdueCount = waiting.filter(
    (s) =>
      deadlineInfo(s.createdAt, s.coach.coachProfile?.turnaroundHours ?? 72)
        .state === "overdue"
  ).length;
  const recent = await db.payment.findMany({
    where: { status: PaymentStatus.PAID },
    include: { coach: true, player: true },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  const pendingCoaches = await db.coachProfile.findMany({
    where: { isPublished: false },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const [coachUsers, playerUsers] = await Promise.all([
    db.user.findMany({
      where: { role: Role.COACH },
      select: {
        id: true,
        name: true,
        coachProfile: {
          select: { isPublished: true, isAi: true, isFounding: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 12,
    }),
    db.user.findMany({
      where: { role: Role.PLAYER },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
      take: 12,
    }),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Platform overview</h1>

      <section className="card">
        <h2 className="text-xl font-semibold">See the site as a coach or player</h2>
        <p className="mt-1 text-sm text-slate-600">
          Open any account to experience their dashboard and flows exactly as
          they see them. A banner lets you return to admin at any time.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <p className="eyebrow text-court-600">Coaches</p>
            <ul className="mt-2 divide-y divide-slate-100">
              {coachUsers.length === 0 && (
                <li className="py-2 text-sm text-slate-500">No coaches yet.</li>
              )}
              {coachUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm">
                    {u.name}
                    {u.coachProfile && !u.coachProfile.isPublished && (
                      <span className="ml-1 text-xs text-amber-700">· pending</span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {u.coachProfile && !u.coachProfile.isAi && (
                      <FoundingCoachButton
                        userId={u.id}
                        isFounding={u.coachProfile.isFounding}
                      />
                    )}
                    <ViewAsButton userId={u.id} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow text-court-600">Players</p>
            <ul className="mt-2 divide-y divide-slate-100">
              {playerUsers.length === 0 && (
                <li className="py-2 text-sm text-slate-500">No players yet.</li>
              )}
              {playerUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm">{u.name}</span>
                  <ViewAsButton userId={u.id} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {pendingCoaches.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold">
            Coach approvals
            <span className="badge ml-2 bg-amber-100 text-amber-700">
              {pendingCoaches.length} waiting
            </span>
          </h2>
          <div className="mt-4 space-y-3">
            {pendingCoaches.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center justify-between gap-4 !py-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {p.user.name}{" "}
                    <span className="text-sm font-normal text-slate-600">· {p.user.email}</span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-slate-600">{p.headline}</p>
                  <p className="stat mt-0.5 text-xs uppercase tracking-wide text-slate-500">
                    {p.location ?? "No location"} · {p.experienceYears} yrs
                    {p.languages ? ` · ${p.languages}` : ""}
                  </p>
                </div>
                <ApproveCoachButton userId={p.userId} />
              </div>
            ))}
          </div>
        </section>
      )}

      {revenueRows.map((g) => (
        <section key={g.currency} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              `Gross revenue${revenueRows.length > 1 ? ` (${g.currency})` : ""}`,
              formatMoney(g._sum.amountCents ?? 0, g.currency),
            ],
            ["Platform earnings", formatMoney(g._sum.platformFeeCents ?? 0, g.currency)],
            ["Paid to coaches", formatMoney(g._sum.coachCents ?? 0, g.currency)],
            ["Payments", String(g._count)],
          ].map(([label, value]) => (
            <div key={label} className="card">
              <p className="text-sm text-slate-600">{label}</p>
              <p className="mt-1 text-2xl font-extrabold text-court-700">{value}</p>
            </div>
          ))}
        </section>
      ))}
      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["Coaches", coachCount],
          ["Players", playerCount],
          ["Video submissions", submissionCount],
          ["Overdue reviews", overdueCount],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-sm text-slate-600">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{value}</p>
          </div>
        ))}
      </section>
      <AdminAnalytics />
      <section>
        <h2 className="text-xl font-semibold">Recent payments</h2>
        <div className="card mt-4 overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-600">
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
