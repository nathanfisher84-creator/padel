import { Suspense } from "react";
import { RegisterForm } from "@/components/RegisterForm";
import { blobUploadsEnabled } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm useBlobStorage={blobUploadsEnabled()} />
    </Suspense>
  );
}
