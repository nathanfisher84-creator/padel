import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripeEnabled, platformFeePercent } from "@/lib/config";
import {
  blobUploadsEnabled,
  blobAuthMode,
  blobToken,
  blobTokenVarName,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Deployment health check: verifies the database connection and reports
 * which storage/payment backends this environment is running with.
 * Used to smoke-test Vercel deployments (and anything else) quickly.
 */
export async function GET(req: Request) {
  try {
    // ?blobtest=1: prove Blob write auth end-to-end with a tiny put+delete.
    let blobWrite: string | undefined;
    if (new URL(req.url).searchParams.get("blobtest") === "1") {
      if (!blobUploadsEnabled()) {
        blobWrite = "skipped: blob not configured";
      } else {
        try {
          const { put, del } = await import("@vercel/blob");
          const blob = await put("healthcheck/ping.txt", "padel healthcheck", {
            access: "public",
            addRandomSuffix: true,
            token: blobToken(),
          });
          await del(blob.url, { token: blobToken() });
          blobWrite = "ok";
        } catch (e) {
          blobWrite = `error: ${e instanceof Error ? e.message : "unknown"}`;
        }
      }
    }
    const [users, coaches, payments] = await Promise.all([
      db.user.count(),
      db.coachProfile.count(),
      db.payment.count(),
    ]);
    return NextResponse.json({
      ok: true,
      db: "connected",
      videoStorage: blobUploadsEnabled() ? "vercel-blob" : "local-disk",
      blobAuth: blobAuthMode(),
      blobTokenVar: blobTokenVarName(),
      oidcTokenPresent: Boolean(process.env.VERCEL_OIDC_TOKEN),
      ...(blobWrite !== undefined ? { blobWrite } : {}),
      // Names only (never values): which storage-related env vars Vercel
      // injected into this deployment — diagnoses store-connection issues.
      storageEnvVars: Object.keys(process.env)
        .filter((k) => /BLOB|_READ_WRITE_TOKEN|DATABASE|POSTGRES|NEON|OIDC/i.test(k))
        .sort(),
      payments: stripeEnabled() ? "stripe" : "demo",
      platformFeePercent: platformFeePercent(),
      counts: { users, coaches, payments },
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: "error", error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
