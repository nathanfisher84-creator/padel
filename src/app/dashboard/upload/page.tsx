import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { Role } from "@/lib/constants";
import { blobUploadsEnabled } from "@/lib/storage";
import { UploadForm } from "@/components/UploadForm";
import { getAiCoach, aiCoachEnabled, AI_COACH_NAME } from "@/lib/aiCoach";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/upload");
  if (session.role !== Role.PLAYER) redirect("/dashboard");

  const [entitlements, aiCoach] = await Promise.all([
    getEntitlements(session.id),
    aiCoachEnabled() ? getAiCoach() : null,
  ]);

  // One selectable option per coach the player has paid access to…
  const paidCoaches = Array.from(
    new Map(entitlements.map((e) => [e.coachId, e])).values()
  ).map((e) => ({ id: e.coachId, name: e.coachName }));

  // …plus the free AI coach, always available and listed first.
  const coaches = [
    ...(aiCoach ? [{ id: aiCoach.id, name: `${AI_COACH_NAME} (AI · free, instant)` }] : []),
    ...paidCoaches.filter((c) => c.id !== aiCoach?.id),
  ];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Upload a video</h1>
      <p className="mt-2 text-slate-600">
        Send a match or training video for feedback — instantly from Nova, our AI
        coach, or from a human coach you&rsquo;ve booked.
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
