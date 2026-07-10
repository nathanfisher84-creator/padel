import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripeEnabled, platformFeePercent } from "@/lib/config";
import { blobUploadsEnabled, blobTokenVarName } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Deployment health check: verifies the database connection and reports
 * which storage/payment backends this environment is running with.
 * Used to smoke-test Vercel deployments (and anything else) quickly.
 */
export async function GET() {
  try {
    const [users, coaches, payments] = await Promise.all([
      db.user.count(),
      db.coachProfile.count(),
      db.payment.count(),
    ]);
    return NextResponse.json({
      ok: true,
      db: "connected",
      videoStorage: blobUploadsEnabled() ? "vercel-blob" : "local-disk",
      blobTokenVar: blobTokenVarName(),
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
