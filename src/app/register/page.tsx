import { Suspense } from "react";
import { RegisterForm } from "@/components/RegisterForm";
import { blobUploadsEnabled } from "@/lib/storage";

export const metadata = {
  title: "Create your free account",
  description:
    "Join PadelPro Coaching as a player to get video feedback from professional coaches, or as a coach to review players worldwide.",
};

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm useBlobStorage={blobUploadsEnabled()} />
    </Suspense>
  );
}
