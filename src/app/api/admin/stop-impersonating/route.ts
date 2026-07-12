import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

/**
 * End an admin "view as" session and restore the admin's own session. Only
 * works when the current session was started by impersonation, and only
 * restores the original account if it is still an admin.
 */
export async function POST() {
  const session = await getSession();
  if (!session?.impersonatorId) {
    return NextResponse.json({ error: "Not viewing as a user." }, { status: 400 });
  }

  const admin = await db.user.findUnique({
    where: { id: session.impersonatorId },
  });
  if (!admin || admin.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Original admin account not found." },
      { status: 400 }
    );
  }

  await createSession({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role as Role,
  });
  return NextResponse.json({ ok: true });
}
