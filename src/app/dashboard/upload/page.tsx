import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { Role } from "@/lib/constants";
import { blobUploadsEnabled } from "@/lib/storage";
import { UploadForm } from "@/components/UploadForm";
import { getAiCoach, AI_COACH_NAME } from "@/lib/aiCoach";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/upload");
  if (session.role !== Role.PLAYER) redirect("/dashboard");

  const [entitlements, aiCoach] = await Promise.all([
    getEntitlements(session.id),
    getAiCoach(),
  ]);

  // One selectable option per coach the player has a credit or plan with.
  // Reviews from Nova (AI) are marked as instant in the dropdown.
  const coaches = Array.from(
    new Map(entitlements.map((e) => [e.coachId, e])).values()
  ).map((e) => ({
    id: e.coachId,
    name:
      e.coachId === aiCoach?.id
        ? `${AI_COACH_NAME} (AI · instant)`
        : e.coachName,
  }));

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Upload a video</h1>
      <p className="mt-2 text-slate-600">
        Send a match or training video for feedback — in minutes from{" "}
        {AI_COACH_NAME}, our AI coach, or within days from a human coach
        you&rsquo;ve booked.
      </p>

      {coaches.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-slate-600">
            You need a review credit or an active monthly plan before uploading.
          </p>
          <Link href="/coaches" className="btn-primary mt-4">
            Choose a coach
          </Link>
        </div>
      ) : (
        <UploadForm coaches={coaches} useBlobStorage={blobUploadsEnabled()} />
      )}
    </div>
  );
}
