import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Role } from "@/lib/constants";

const bodySchema = z.object({
  headline: z.string().trim().min(3).max(120),
  bio: z.string().trim().max(2000),
  location: z.string().trim().max(80).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60),
  oneOffPrice: z.coerce.number().min(1).max(10000),
  monthlyPrice: z.coerce.number().min(1).max(10000),
  monthlyVideoLimit: z.coerce.number().int().min(1).max(30),
  currency: z.enum(["EUR", "USD", "GBP"]),
  isPublished: z.boolean(),
});

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== Role.COACH) {
    return NextResponse.json({ error: "Coach account required." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  await db.coachProfile.update({
    where: { userId: session.id },
    data: {
      headline: data.headline,
      bio: data.bio,
      location: data.location,
      experienceYears: data.experienceYears,
      oneOffPriceCents: Math.round(data.oneOffPrice * 100),
      monthlyPriceCents: Math.round(data.monthlyPrice * 100),
      monthlyVideoLimit: data.monthlyVideoLimit,
      currency: data.currency,
      isPublished: data.isPublished,
    },
  });

  return NextResponse.json({ ok: true });
}
