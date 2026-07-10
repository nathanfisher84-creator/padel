import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession } from "@/lib/auth";
import { getEntitlementForCoach } from "@/lib/entitlements";
import { Role } from "@/lib/constants";
import { MAX_VIDEO_BYTES, VIDEO_CONTENT_TYPES } from "@/lib/storage";

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
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await getSession();
        if (!session || session.role !== Role.PLAYER) {
          throw new Error("Player account required.");
        }
        const { coachId } = JSON.parse(clientPayload ?? "{}") as {
          coachId?: string;
        };
        if (!coachId) throw new Error("Missing coach.");
        const entitlement = await getEntitlementForCoach(session.id, coachId);
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      { status: 400 }
    );
  }
}
