import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession, createSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

const bodySchema = z.object({ userId: z.string().min(1) });

/**
 * Admin "view as": start impersonating a coach or player so the owner can see
 * exactly what that user sees. Admin-only; the admin's id is stored in the
 * session so it can be restored via /api/admin/stop-impersonating.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Admin account required." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Which user?" }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: parsed.data.userId } });
  if (!target || target.role === Role.ADMIN) {
    return NextResponse.json(
      { error: "Pick a coach or player to view as." },
      { status: 400 }
    );
  }

  await createSession({
    id: target.id,
    email: target.email,
    name: target.name,
    role: target.role as Role,
    impersonatorId: session.id,
  });
  return NextResponse.json({ ok: true });
}
