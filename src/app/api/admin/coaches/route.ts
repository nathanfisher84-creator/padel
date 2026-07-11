import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

const bodySchema = z.object({
  userId: z.string().min(1),
  publish: z.boolean(),
});

/** Approve (or unpublish) a coach profile. Curated marketplace: every new
 *  coach is reviewed by an admin before going live. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin account required." }, { status: 403 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const profile = await db.coachProfile.update({
    where: { userId: parsed.data.userId },
    data: { isPublished: parsed.data.publish },
  });
  return NextResponse.json({ ok: true, isPublished: profile.isPublished });
}
