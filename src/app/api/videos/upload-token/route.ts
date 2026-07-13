import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import { getEntitlementForCoach } from "@/lib/entitlements";
import { Role } from "@/lib/constants";
import { MAX_VIDEO_BYTES, VIDEO_CONTENT_TYPES, blobToken } from "@/lib/storage";

/**
 * Issues short-lived tokens for direct browser-to-Vercel-Blob uploads
 * (only used when a Blob store is connected). The entitlement check runs
 * here so a player can't upload without a credit or subscription; the
 * submission row itself is created by POST /api/videos afterwards.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // Explicit token if one is configured; otherwise undefined lets the
      // SDK fall back to OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID).
      token: blobToken(),
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await getSession();
        if (!session) throw new Error("Please log in first.");
        const payload = JSON.parse(clientPayload ?? "{}") as {
          coachId?: string;
          kind?: string;
        };

        // Coaches uploading their profile intro or a feedback reply video.
        if (payload.kind === "coach-intro" || payload.kind === "feedback") {
          if (session.role !== Role.COACH) {
            throw new Error("Coach account required.");
          }
          return {
            allowedContentTypes: VIDEO_CONTENT_TYPES,
            maximumSizeInBytes: MAX_VIDEO_BYTES,
            addRandomSuffix: true,
          };
        }

        // Players uploading a match video for review.
        if (session.role !== Role.PLAYER) {
          throw new Error("Player account required.");
        }
        if (!payload.coachId) throw new Error("Missing coach.");
        const entitlement = await getEntitlementForCoach(
          session.id,
          payload.coachId
        );
        if (!entitlement) {
          throw new Error(
            "No review credit or active subscription with this coach."
          );
        }
        return {
          allowedContentTypes: VIDEO_CONTENT_TYPES,
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No-op: the client registers the submission via POST /api/videos.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed.";
    // Surface the real cause in the runtime logs — the browser only shows a
    // generic "failed to retrieve the client token" for these failures.
    console.error("upload-token failed:", message);
    // Client uploads need an actual read-write token: the SDK's OIDC
    // fallback covers server-side calls only, not minting client tokens.
    const misconfigured = message.includes("No read-write token");
    return NextResponse.json(
      {
        error: misconfigured
          ? "Uploads are temporarily unavailable while we finish setting up storage — please try again soon."
          : message,
      },
      { status: misconfigured ? 503 : 400 }
    );
  }
}
