import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const periods = [
  { id: "P1", label: "Period 1", startHHmm: "0930", endHHmm: "1030" },
  { id: "P2", label: "Period 2", startHHmm: "1030", endHHmm: "1130" },
  { id: "P3", label: "Period 3", startHHmm: "1145", endHHmm: "1245" },
  { id: "P4", label: "Period 4", startHHmm: "1400", endHHmm: "1500" },
  { id: "P5", label: "Period 5", startHHmm: "1500", endHHmm: "1600" },
  { id: "P6", label: "Period 6", startHHmm: "1600", endHHmm: "1700" },
];

const semesterSections: Record<number, string[]> = {
  1: ["Leopards", "Rhinos", "Wolves", "Whales", "Tigers", "Panthers"],
  2: ["Leopards", "Rhinos", "Wolves", "Whales", "Tigers", "Panthers"],
  4: ["Leopards", "Rhinos", "Tigers", "Panthers"],
  6: ["Leopards", "Rhinos", "Wolves", "Whales", "Tigers", "Panthers"],
};

async function seedTaxonomy() {
  for (const period of periods) {
    await prisma.period.upsert({
      where: { id: period.id },
      update: {
        label: period.label,
        startHHmm: period.startHHmm,
        endHHmm: period.endHHmm,
      },
      create: period,
    });
  }

  for (const [numberStr, sectionNames] of Object.entries(semesterSections)) {
    const number = Number(numberStr);
    const name = `Semester ${number}`;
    const semester = await prisma.semester.upsert({
      where: { number },
      update: { name },
      create: { number, name },
    });

    for (const sectionName of sectionNames) {
      await prisma.section.upsert({
        where: {
          semesterId_name: {
            semesterId: semester.id,
            name: sectionName,
          },
        },
        update: {},
        create: {
          name: sectionName,
          semesterId: semester.id,
        },
      });
    }
  }
}

async function seedPasskey() {
  const hash = process.env.PASSKEY_HASH;
  const version = Number(process.env.PASSKEY_VERSION ?? "1");

  if (!hash) {
    console.warn(
      "PASSKEY_HASH is not set. Skipping Passkey seeding. Provide hash and rerun seed."
    );
    return;
  }

  await prisma.passkey.upsert({
    where: { id: 1 },
    update: {
      hash,
      version,
      rotatedAt: new Date(),
    },
    create: {
      hash,
      version,
    },
  });
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const passwordVersion = Number(process.env.ADMIN_PASSWORD_VERSION ?? "1");

  if (!email || !passwordHash) {
    console.warn(
      "ADMIN_EMAIL or ADMIN_PASSWORD_HASH missing. Skipping admin seed."
    );
    return;
  }

  await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      passwordVersion,
    },
    create: {
      email,
      passwordHash,
      passwordVersion,
    },
  });
}

async function main() {
  await seedTaxonomy();
  await seedPasskey();
  await seedAdminUser();
}

main()
  .catch((error) => {
    console.error("Seed error", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
