import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Role, SubmissionStatus } from "@/lib/constants";
import { FeedbackForm } from "@/components/FeedbackForm";
import { RatingForm } from "@/components/RatingForm";
import { blobUploadsEnabled } from "@/lib/storage";
import { FOCUS_SHOTS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session) redirect(`/login?next=/submissions/${params.id}`);

  const submission = await db.videoSubmission.findUnique({
    where: { id: params.id },
    include: { player: true, coach: true, feedback: true, review: true },
  });
  if (!submission) notFound();

  const isPlayer = session.id === submission.playerId;
  const isCoach = session.id === submission.coachId;
  if (!isPlayer && !isCoach && session.role !== Role.ADMIN) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{submission.title}</h1>
          <span
            className={`badge ${
              submission.status === SubmissionStatus.REVIEWED
                ? "bg-ball-500/20 text-ball-600"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {submission.status === SubmissionStatus.REVIEWED
              ? "Feedback ready"
              : "Awaiting feedback"}
          </span>
        </div>
        <p className="mt-1 text-slate-500">
          {submission.player.name} → Coach {submission.coach.name} ·{" "}
          {formatDate(submission.createdAt)}
        </p>
      </div>

      <video
        controls
        preload="metadata"
        className="aspect-video w-full rounded-xl border border-slate-200 bg-black"
        src={`/api/videos/${submission.id}/stream`}
      />

      {submission.focusShots && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow text-court-600">Focus on</span>
          {submission.focusShots.split(",").map((key) => (
            <span key={key} className="badge bg-court-100 text-court-800">
              {FOCUS_SHOTS.find((sh) => sh.key === key)?.label ?? key}
            </span>
          ))}
        </div>
      )}

      {submission.notes && (
        <div className="card">
          <h2 className="font-semibold">
            {isPlayer ? "Your notes to the coach" : "Player's notes"}
          </h2>
          <p className="mt-2 whitespace-pre-line text-slate-600">
            {submission.notes}
          </p>
        </div>
      )}

      {submission.feedback ? (
        <div className="card border-ball-500/40 bg-ball-500/5">
          <h2 className="font-semibold">
            Feedback from Coach {submission.coach.name}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {formatDate(submission.feedback.createdAt)}
          </p>
          {submission.feedback.videoUrl && (
            <video
              controls
              preload="metadata"
              className="mt-3 aspect-video w-full rounded-lg border border-slate-200 bg-court-950"
              src={submission.feedback.videoUrl}
            />
          )}
          <p className="mt-3 whitespace-pre-line text-slate-700">
            {submission.feedback.content}
          </p>
        </div>
      ) : isCoach ? (
        <FeedbackForm
          submissionId={submission.id}
          useBlobStorage={blobUploadsEnabled()}
        />
      ) : (
        <div className="card text-sm text-slate-500">
          Coach {submission.coach.name} hasn&apos;t reviewed this video yet —
          you&apos;ll see the feedback here as soon as it&apos;s ready.
        </div>
      )}

      {submission.feedback && isPlayer && !submission.review && (
        <RatingForm submissionId={submission.id} />
      )}
      {submission.review && (
        <div className="card">
          <h2 className="font-semibold">
            {isPlayer ? "Your rating" : "Player rating"}
          </h2>
          <p className="mt-2 text-xl text-ball-600" aria-label={`${submission.review.rating} out of 5 stars`}>
            {"★".repeat(submission.review.rating)}
            <span className="text-slate-300">{"★".repeat(5 - submission.review.rating)}</span>
          </p>
          {submission.review.comment && (
            <p className="mt-2 text-sm text-slate-600">{submission.review.comment}</p>
          )}
        </div>
      )}
    </div>
  );
}
