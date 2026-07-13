import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { foundingFeePercent } from "@/lib/config";
import { Role } from "@/lib/constants";

const bodySchema = z.object({
  userId: z.string().min(1),
  founding: z.boolean(),
});

/**
 * Toggle a coach's founding-coach status. Founding coaches get the public
 * badge and the promotional platform fee (foundingFeePercent, default 10%)
 * on all future payments; turning it off restores the standard rate.
 * Already-recorded payments keep the split they were made with.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin account required." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const profile = await db.coachProfile.findUnique({
    where: { userId: parsed.data.userId },
    select: { isAi: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "No coach profile found." }, { status: 404 });
  }
  if (profile.isAi) {
    return NextResponse.json(
      { error: "The AI coach has no revenue split to change." },
      { status: 400 }
    );
  }

  const updated = await db.coachProfile.update({
    where: { userId: parsed.data.userId },
    data: parsed.data.founding
      ? { isFounding: true, feePercentOverride: foundingFeePercent() }
      : { isFounding: false, feePercentOverride: null },
  });
  return NextResponse.json({
    ok: true,
    isFounding: updated.isFounding,
    feePercentOverride: updated.feePercentOverride,
  });
}
