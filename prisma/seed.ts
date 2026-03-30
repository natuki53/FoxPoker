import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { MASTER_PREFECTURES } from "../src/lib/master-prefectures-data";
import { MASTER_LISTING_PLANS } from "../src/lib/master-listing-plans-data";
import { MASTER_GAME_TYPES } from "../src/lib/master-game-types-data";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function seedSystemAdmin() {
  const email = process.env.SYSTEM_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SYSTEM_ADMIN_PASSWORD;
  const displayName = process.env.SYSTEM_ADMIN_NAME?.trim() || "System Admin";

  if (!email || !password) {
    console.log("Skipped system admin seed. Set SYSTEM_ADMIN_EMAIL and SYSTEM_ADMIN_PASSWORD to enable.");
    return;
  }

  if (password.length < 8) {
    throw new Error("SYSTEM_ADMIN_PASSWORD must be at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      displayName,
      passwordHash,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      displayName,
      passwordHash,
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Seeded system admin account: ${email}`);
}

async function main() {
  console.log("Seeding prefectures...");

  for (const pref of MASTER_PREFECTURES) {
    await prisma.prefecture.upsert({
      where: { code: pref.code },
      update: { ...pref },
      create: { ...pref },
    });
  }

  console.log(`Seeded ${MASTER_PREFECTURES.length} prefectures.`);
  console.log("Seeding listing plans...");
  for (const plan of MASTER_LISTING_PLANS) {
    const existing = await prisma.listingPlan.findFirst({
      where: { name: plan.name },
      select: { id: true },
    });
    if (existing) {
      await prisma.listingPlan.update({
        where: { id: existing.id },
        data: plan,
      });
    } else {
      await prisma.listingPlan.create({ data: plan });
    }
  }
  console.log(`Upserted ${MASTER_LISTING_PLANS.length} listing plans.`);

  console.log("Seeding game types...");
  for (const gt of MASTER_GAME_TYPES) {
    await prisma.gameType.upsert({
      where: { name: gt.name },
      update: {
        abbreviation: gt.abbreviation,
        description: gt.description,
        sortOrder: gt.sortOrder,
        isActive: gt.isActive,
      },
      create: {
        name: gt.name,
        abbreviation: gt.abbreviation,
        description: gt.description,
        sortOrder: gt.sortOrder,
        isActive: gt.isActive,
      },
    });
  }
  console.log(`Upserted ${MASTER_GAME_TYPES.length} game types.`);

  await seedSystemAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
