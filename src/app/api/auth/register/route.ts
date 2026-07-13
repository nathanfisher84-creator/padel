import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { COACH_AGREEMENT_VERSION } from "@/lib/coachAgreement";
import { redactContact, redactMaybe } from "@/lib/redact";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
  role: z.enum([Role.PLAYER, Role.COACH]),
  // Coach-only profile fields, validated when role is COACH.
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(80).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  oneOffPrice: z.coerce.number().min(1).max(10000).optional(),
  monthlyPrice: z.coerce.number().min(1).max(10000).optional(),
  currency: z.enum(["AED", "EUR", "USD", "GBP"]).optional(),
  turnaroundHours: z.coerce.number().int().optional(),
  languages: z.string().trim().max(120).optional(),
  certifications: z.string().trim().max(1000).optional(),
  careerHighlights: z.string().trim().max(1000).optional(),
  acceptCoachAgreement: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  if (data.role === Role.COACH && (!data.oneOffPrice || !data.monthlyPrice)) {
    return NextResponse.json(
      { error: "Coaches must set a one-off review price and a monthly price." },
      { status: 400 }
    );
  }
  if (data.role === Role.COACH && data.acceptCoachAgreement !== true) {
    return NextResponse.json(
      { error: "Please read and accept the Coach Agreement to join as a coach." },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      ...(data.role === Role.COACH
        ? {
            coachProfile: {
              create: {
                headline: redactContact(
                  data.headline || `Padel coach ${data.name}`
                ),
                bio: redactContact(data.bio || ""),
                location: redactMaybe(data.location),
                experienceYears: data.experienceYears ?? 0,
                oneOffPriceCents: Math.round(data.oneOffPrice! * 100),
                monthlyPriceCents: Math.round(data.monthlyPrice! * 100),
                currency: data.currency ?? "AED",
                turnaroundHours: [24, 48, 72, 168].includes(
                  data.turnaroundHours ?? 0
                )
                  ? data.turnaroundHours
                  : 72,
                languages: redactMaybe(data.languages),
                certifications: redactMaybe(data.certifications),
                careerHighlights: redactMaybe(data.careerHighlights),
                agreementAcceptedAt: new Date(),
                agreementVersion: COACH_AGREEMENT_VERSION,
              },
            },
          }
        : {}),
    },
  });

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
  });
  return NextResponse.json({ ok: true });
}
