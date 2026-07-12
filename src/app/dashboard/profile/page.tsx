import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { CoachProfileForm } from "@/components/CoachProfileForm";
import { CoachMediaForm } from "@/components/CoachMediaForm";
import { blobUploadsEnabled } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CoachProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/dashboard/profile");
  if (session.role !== Role.COACH) redirect("/dashboard");

  const profile = await db.coachProfile.findUnique({
    where: { userId: session.id },
  });
  if (!profile) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-bold">My coach profile</h1>
      <p className="mt-2 text-slate-600">
        This is what players see when they browse coaches. You set your own
        rates and keep 80% of every payment — the 20% platform fee is deducted
        automatically.
      </p>
      <CoachMediaForm
        photoUrl={profile.photoUrl}
        introVideoUrl={profile.introVideoUrl}
        useBlobStorage={blobUploadsEnabled()}
      />
      <CoachProfileForm
        initial={{
          headline: profile.headline,
          bestFor: profile.bestFor ?? "",
          bio: profile.bio,
          location: profile.location ?? "",
          experienceYears: profile.experienceYears,
          oneOffPrice: profile.oneOffPriceCents / 100,
          monthlyPrice: profile.monthlyPriceCents / 100,
          monthlyVideoLimit: profile.monthlyVideoLimit,
          currency: profile.currency,
          isPublished: profile.isPublished,
          turnaroundHours: profile.turnaroundHours,
          languages: profile.languages ?? "",
          certifications: profile.certifications ?? "",
          careerHighlights: profile.careerHighlights ?? "",
        }}
      />
    </div>
  );
}
