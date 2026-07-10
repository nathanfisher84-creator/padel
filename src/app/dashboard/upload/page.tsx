import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { Role } from "@/lib/constants";
import { blobUploadsEnabled } from "@/lib/storage";
import { UploadForm } from "@/components/UploadForm";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/upload");
  if (session.role !== Role.PLAYER) redirect("/dashboard");

  const entitlements = await getEntitlements(session.id);

  // One selectable option per coach.
  const coaches = Array.from(
    new Map(entitlements.map((e) => [e.coachId, e])).values()
  );

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">Upload a video</h1>
      <p className="mt-2 text-slate-600">
        Send a match or training video to your coach for personal feedback.
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
        <UploadForm
          coaches={coaches.map((e) => ({ id: e.coachId, name: e.coachName }))}
          useBlobStorage={blobUploadsEnabled()}
        />
      )}
    </div>
  );
}
