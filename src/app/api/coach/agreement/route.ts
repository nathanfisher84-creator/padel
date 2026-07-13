import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { COACH_AGREEMENT_VERSION } from "@/lib/coachAgreement";
import { Role } from "@/lib/constants";

/**
 * Record the logged-in coach's acceptance of the current Coach Agreement.
 * Used by coaches who signed up before the agreement existed (or before the
 * current version) — new signups accept during registration.
 */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return NextResponse.json({ error: "Coach account required." }, { status: 403 });
  }

  const updated = await db.coachProfile.updateMany({
    where: { userId: session.id },
    data: {
      agreementAcceptedAt: new Date(),
      agreementVersion: COACH_AGREEMENT_VERSION,
    },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "No coach profile found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, version: COACH_AGREEMENT_VERSION });
}
