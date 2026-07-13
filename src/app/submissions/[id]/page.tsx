import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Role, SubmissionStatus } from "@/lib/constants";
import { FeedbackForm } from "@/components/FeedbackForm";
import { RatingForm } from "@/components/RatingForm";
import { AnalysisPlayer } from "@/components/AnalysisPlayer";
import { AiReviewRunner } from "@/components/AiReviewRunner";
import { CoachPrescan } from "@/components/CoachPrescan";
import { blobUploadsEnabled, VIDEO_RETENTION_DAYS } from "@/lib/storage";
import { FOCUS_SHOTS, playerSideLabel } from "@/lib/constants";

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
    include: {
      player: true,
      coach: { include: { coachProfile: { select: { isAi: true } } } },
      feedback: true,
      review: true,
      comments: { orderBy: { timeSeconds: "asc" } },
    },
  });
  if (!submission) notFound();

  const isPlayer = session.id === submission.playerId;
  const isCoach = session.id === submission.coachId;
  const isAiCoach = Boolean(submission.coach.coachProfile?.isAi);
  if (!isPlayer && !isCoach && session.role !== Role.ADMIN) notFound();

  // The coach annotates while the review is open; once delivered the notes
  // become part of the read-only feedback the player sees. The AI coach writes
  // its own notes, so there's no human annotation window.
  const canAnnotate = isCoach && !isAiCoach && !submission.feedback;
  const showComments =
    canAnnotate || Boolean(submission.feedback) || session.role === Role.ADMIN;

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
        <p className="mt-1 text-slate-600">
          {submission.player.name} →{" "}
          {isAiCoach ? submission.coach.name : `Coach ${submission.coach.name}`} ·{" "}
          {formatDate(submission.createdAt)}
        </p>
      </div>

      {submission.videoPurgedAt ? (
        <div className="card text-sm text-slate-600">
          <p className="font-semibold text-slate-700">
            The video file was removed 30 days after your review was delivered.
          </p>
          <p className="mt-1">
            Your written feedback{showComments && submission.comments.length > 0
              ? " and the timestamped notes below are"
              : " is"}{" "}
            kept forever.
          </p>
          {showComments && submission.comments.length > 0 && (
            <ul className="mt-4 space-y-2">
              {submission.comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span className="stat shrink-0 font-semibold text-court-700">
                    {Math.floor(c.timeSeconds / 60)}:
                    {String(Math.floor(c.timeSeconds % 60)).padStart(2, "0")}
                  </span>
                  <span>{c.body}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <AnalysisPlayer
            src={`/api/videos/${submission.id}/stream`}
            submissionId={submission.id}
            editable={canAnnotate}
            initialComments={showComments ? submission.comments : []}
          />
          {canAnnotate && (
            <CoachPrescan
              submissionId={submission.id}
              initial={submission.aiPrescan}
            />
          )}
          {submission.feedback && (
            <p className="!mt-2 text-xs text-slate-500">
              This video file will be removed on{" "}
              {formatDate(
                new Date(
                  new Date(submission.feedback.createdAt).getTime() +
                    VIDEO_RETENTION_DAYS * 24 * 60 * 60 * 1000
                )
              )}{" "}
              ({VIDEO_RETENTION_DAYS} days after your feedback was delivered).
              The written feedback and timestamped notes stay forever.
            </p>
          )}
        </>
      )}

      {submission.playerOutfit && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow text-court-600">
            {isPlayer ? "You are" : "The player is"}
          </span>
          {submission.playerRefImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={submission.playerRefImage}
              alt={isPlayer ? "You, from the video's first frame" : "The player, from the video's first frame"}
              className="h-12 w-auto rounded-md border border-court-200"
            />
          )}
          <span className="badge bg-court-100 text-court-800">
            {submission.playerOutfit}
            {playerSideLabel(submission.playerSide)
              ? ` · ${playerSideLabel(submission.playerSide)}`
              : ""}
          </span>
        </div>
      )}

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
            {isAiCoach
              ? "Your AI coach analysis"
              : `Feedback from Coach ${submission.coach.name}`}
          </h2>
          <p className="mt-1 text-xs text-slate-600">
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
      ) : isAiCoach && isPlayer ? (
        <AiReviewRunner submissionId={submission.id} />
      ) : isCoach ? (
        <FeedbackForm
          submissionId={submission.id}
          useBlobStorage={blobUploadsEnabled()}
        />
      ) : (
        <div className="card text-sm text-slate-600">
          {isAiCoach
            ? `${submission.coach.name} is analysing this clip — refresh in a moment.`
            : `Coach ${submission.coach.name} hasn't reviewed this video yet — you'll see the feedback here as soon as it's ready.`}
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
