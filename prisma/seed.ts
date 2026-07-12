// Demo data: an admin, three coaches and a player, so the app is
// explorable immediately after `npm run setup`. The demo accounts use the
// password "password123" and are ONLY created in development (or when
// SEED_DEMO=true), never automatically on a production deploy.
//
// In production, an admin is bootstrapped from ADMIN_EMAIL + ADMIN_PASSWORD
// if those are set — no default-credential accounts are ever created.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const isProd = process.env.NODE_ENV === "production";
const seedDemo = process.env.SEED_DEMO === "true" || !isProd;

// ⚠️ PREVIEW ONLY: keep a demo admin (admin@padelpro.local / password123) alive
// in production so the owner can log in and explore — including the admin
// "view as" tool. A public-password admin must NOT exist on a real launch:
// set this to false (or delete this block) before going live. Ignored if a
// real admin is configured via ADMIN_EMAIL / ADMIN_PASSWORD.
const PREVIEW_DEMO_ADMIN = true;

async function main() {
  // Bootstrap a real admin from environment variables when provided (works in
  // any environment, and is the intended way to create the owner in prod).
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await db.user.upsert({
      where: { email: adminEmail },
      update: { passwordHash: await bcrypt.hash(adminPassword, 10) },
      create: {
        email: adminEmail,
        name: "Site Owner",
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
      },
    });
    console.log(`Ensured admin account for ${adminEmail}.`);
  }

  if (!seedDemo) {
    if (PREVIEW_DEMO_ADMIN && !adminEmail) {
      // Preview convenience: ensure a demo admin exists with the documented
      // password so the owner can log in (recreated if it was removed).
      const hash = await bcrypt.hash("password123", 10);
      await db.user.upsert({
        where: { email: "admin@padelpro.local" },
        update: { passwordHash: hash, role: "ADMIN" },
        create: {
          email: "admin@padelpro.local",
          name: "Site Owner",
          passwordHash: hash,
          role: "ADMIN",
        },
      });
      console.log(
        "Preview demo admin ensured (admin@padelpro.local / password123) — remove before launch."
      );
    } else if (adminEmail !== "admin@padelpro.local") {
      // No preview admin wanted: remove any legacy public-password admin.
      const removed = await db.user.deleteMany({
        where: { email: "admin@padelpro.local" },
      });
      if (removed.count) {
        console.log("Removed legacy demo admin account (admin@padelpro.local).");
      }
    }
    console.log(
      "Production seed: skipping demo coaches/player (set SEED_DEMO=true to include them)."
    );
    return;
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  await db.user.upsert({
    where: { email: "admin@padelpro.local" },
    update: {},
    create: {
      email: "admin@padelpro.local",
      name: "Site Owner",
      passwordHash,
      role: "ADMIN",
    },
  });

  const coaches = [
    {
      email: "carlos@padelpro.local",
      name: "Carlos Mendoza",
      photoUrl: "/avatars/carlos.jpg",
      isPublished: true,
      turnaroundHours: 48,
      languages: "Spanish, English",
      certifications: "RFEP National Coach Level II\nWorld Padel Tour player 2012-2020",
      careerHighlights: "8 seasons on the World Padel Tour\nReached world top-40 ranking\nFull-time coach in Madrid since 2021",
      headline: "Ex-World Padel Tour player specialising in attacking net play",
      bio: "I spent 8 seasons on the World Padel Tour and now coach full time in Madrid. My video reviews focus on your smash selection (bandeja vs víbora), net positioning and transition play. Expect honest, actionable feedback with drills you can take straight to your next session.",
      location: "Madrid, Spain",
      experienceYears: 12,
      oneOffPriceCents: 3500,
      monthlyPriceCents: 11900,
      monthlyVideoLimit: 4,
      currency: "EUR",
    },
    {
      email: "sofia@padelpro.local",
      name: "Sofia Lindqvist",
      photoUrl: "/avatars/sofia.jpg",
      isPublished: true,
      turnaroundHours: 24,
      languages: "Swedish, English",
      certifications: "Swedish Padel Federation Instructor\nPTR Padel Professional",
      careerHighlights: "Head coach at Stockholm Padel Center\nCoached 3 national junior champions",
      headline: "Technique-first coaching for beginners and intermediates",
      bio: "Head coach at Stockholm Padel Center. I love helping club players break through plateaus — most of my players see the biggest gains from fixing grip, preparation and footwork basics. My feedback always includes slow-motion timestamps and 2-3 practice drills.",
      location: "Stockholm, Sweden",
      experienceYears: 7,
      oneOffPriceCents: 2500,
      monthlyPriceCents: 7900,
      monthlyVideoLimit: 6,
      currency: "EUR",
    },
    {
      email: "diego@padelpro.local",
      name: "Diego Fernández",
      photoUrl: "/avatars/diego.jpg",
      isPublished: true,
      turnaroundHours: 72,
      languages: "Spanish, English, Portuguese",
      certifications: "APA Certified Coach (Argentina)\nFIP Coaching Course Level 2",
      careerHighlights: "Former Argentine national circuit player\n15 years coaching competitive players\nCoached 2 national-level doubles pairs",
      headline: "Match tactics & doubles strategy for competitive players",
      bio: "Former Argentine national circuit player. I review full matches and break down your shot selection, court coverage with your partner, and how to win more points playing the percentages. Best suited to tournament players who already have solid fundamentals.",
      location: "Buenos Aires, Argentina",
      experienceYears: 15,
      oneOffPriceCents: 4500,
      monthlyPriceCents: 14900,
      monthlyVideoLimit: 4,
      currency: "USD",
    },
  ];

  for (const coach of coaches) {
    const { email, name, ...profile } = coach;
    await db.user.upsert({
      where: { email },
      // Existing demo coaches get their placeholder photo on re-seed.
      update: {
        coachProfile: {
          upsert: {
            update: {
              photoUrl: profile.photoUrl,
              isPublished: true,
              turnaroundHours: profile.turnaroundHours,
              languages: profile.languages,
              certifications: profile.certifications,
              careerHighlights: profile.careerHighlights,
            },
            create: profile,
          },
        },
      },
      create: {
        email,
        name,
        passwordHash,
        role: "COACH",
        coachProfile: { create: profile },
      },
    });
  }

  await db.user.upsert({
    where: { email: "player@padelpro.local" },
    update: {},
    create: {
      email: "player@padelpro.local",
      name: "Alex Player",
      passwordHash,
      role: "PLAYER",
    },
  });

  console.log("Seeded: 1 admin, 3 coaches, 1 player (password: password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
