// Demo data: an admin, three coaches and a player, so the app is
// explorable immediately after `npm run setup`.
// All demo accounts use the password "password123".
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
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
