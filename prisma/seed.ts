import { prisma } from "../src/lib/prisma";
import { PLAN_CONFIGS, PLAN_NAMES, SUBSCRIPTION_STATUS } from "../src/lib/saas/plan-config";
import { hash } from "bcryptjs";

async function main() {
  console.log("Starting database seed...");

  // Seed subscription plans
  for (const planName of Object.keys(PLAN_CONFIGS)) {
    const config = PLAN_CONFIGS[planName as keyof typeof PLAN_CONFIGS];
    await prisma.subscriptionPlan.upsert({
      where: { name: config.name },
      update: {
        displayName: config.displayName.fr,
        description: config.description.fr,
        price: config.priceMAD * 100,
        billingPeriod: "MONTHLY",
        isActive: true,
        features: config.features,
      },
      create: {
        name: config.name,
        displayName: config.displayName.fr,
        description: config.description.fr,
        price: config.priceMAD * 100,
        billingPeriod: "MONTHLY",
        isActive: true,
        features: config.features,
      },
    });
  }
  console.log("✓ Seeded subscription plans");

  // Create the primary organization
  const org = await prisma.organization.upsert({
    where: { slug: "smart-kids-education-care" },
    update: {},
    create: {
      name: "Smart Kids Education Care",
      slug: "smart-kids-education-care",
      status: "ACTIVE",
    },
  });
  console.log("✓ Organization ready:", org.name);

  // Password hash for all seed accounts
  const passwordHash = await hash("Demo123!", 10);

  // Helper function to create a user with password
  async function upsertUserWithPassword(
    email: string,
    name: string,
    role: string,
    organizationId: string
  ) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    let user;
    if (existingUser) {
      user = await prisma.user.update({
        where: { email },
        data: { name, role, organizationId, emailVerified: true },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name,
          emailVerified: true,
          role,
          organizationId,
        },
      });
    }

    // Create or update password account
    const accountId = `acc_${email}`;
    await prisma.account.deleteMany({
      where: { providerId: "credentials", accountId: `${email}_credentials` },
    });

    await prisma.account.create({
      data: {
        id: accountId,
        providerId: "credentials",
        accountId: `${email}_credentials`,
        userId: user.id,
        password: passwordHash,
      },
    });

    return user;
  }

  // Create Super Admin
  const superAdmin = await upsertUserWithPassword(
    "admin@smartkids.local",
    "Super Admin",
    "SUPER_ADMIN",
    org.id
  );

  // Create Admin
  const admin = await upsertUserWithPassword(
    "admin-center@smartkids.local",
    "Admin Centre",
    "ADMIN",
    org.id
  );

  // Create Manager
  const manager = await upsertUserWithPassword(
    "manager@smartkids.local",
    "Manager",
    "MANAGER",
    org.id
  );

  // Create 3 Teachers
  const teachers = [];
  for (let i = 1; i <= 3; i++) {
    const teacher = await upsertUserWithPassword(
      `teacher${i}@smartkids.local`,
      `Professeur ${i}`,
      "TEACHER",
      org.id
    );
    teachers.push(teacher);
  }

  // Create Accountant
  const accountant = await upsertUserWithPassword(
    "accountant@smartkids.local",
    "Comptable",
    "ACCOUNTANT",
    org.id
  );

  console.log("✓ Users created");

  // Create 3 Classes
  const classNames = ["Petite Section", "Moyenne Section", "Grande Section"];
  const classes = [];
  for (let i = 0; i < 3; i++) {
    const cls = await prisma.class.upsert({
      where: { id: `cls-${i + 1}` },
      update: {},
      create: {
        id: `cls-${i + 1}`,
        name: classNames[i],
        capacity: 20,
        status: "ACTIVE",
        organizationId: org.id,
      },
    });
    classes.push(cls);
  }
  console.log("✓ Classes created");

  // Assign teachers to classes
  for (let i = 0; i < 3; i++) {
    const where = { classId_userId: { classId: classes[i].id, userId: teachers[i].id } };
    const existing = await prisma.classTeacher.findUnique({ where });
    if (existing) {
      await prisma.classTeacher.update({ where, data: { isPrimary: true } });
    } else {
      await prisma.classTeacher.create({
        data: { classId: classes[i].id, userId: teachers[i].id, isPrimary: true },
      });
    }
  }
  console.log("✓ Teachers assigned to classes");

  // Create 8 Children across 3 classes
  const childrenNames = [
    { firstName: "Adam", lastName: "HAFA", gender: "MALE" },
    { firstName: "Sarah", lastName: "BENALI", gender: "FEMALE" },
    { firstName: "Youssef", lastName: "CHERIF", gender: "MALE" },
    { firstName: "Lina", lastName: "MORRIS", gender: "FEMALE" },
    { firstName: "Omar", lastName: "KHALIL", gender: "MALE" },
    { firstName: "Amina", lastName: "DIAZ", gender: "FEMALE" },
    { firstName: "Karim", lastName: "BOUCHER", gender: "MALE" },
    { firstName: "Fatima", lastName: "NOURI", gender: "FEMALE" },
  ];

  const children = [];
  for (let i = 0; i < 8; i++) {
    const classIdx = i % 3;
    const birthDate = new Date();
    birthDate.setFullYear(2024 - Math.floor(i / 2)); // Ages 2-5 (2024-2022)

    const child = await prisma.child.upsert({
      where: { id: `child-${i + 1}` },
      update: {
        firstName: childrenNames[i].firstName,
        lastName: childrenNames[i].lastName,
        dateOfBirth: birthDate,
        gender: childrenNames[i].gender,
        classId: classes[classIdx].id,
      },
      create: {
        id: `child-${i + 1}`,
        firstName: childrenNames[i].firstName,
        lastName: childrenNames[i].lastName,
        dateOfBirth: birthDate,
        gender: childrenNames[i].gender,
        enrollmentDate: new Date(),
        status: "ACTIVE",
        classId: classes[classIdx].id,
        organizationId: org.id,
      },
    });
    children.push(child);
  }
  console.log("✓ Children created");

  // Create 5 Parents and link to children (2 children per parent)
  const parentNames = [
    { name: "Karim HAFA", email: "parent1@smartkids.local" },
    { name: "Amina BENALI", email: "parent2@smartkids.local" },
    { name: "Said CHERIF", email: "parent3@smartkids.local" },
    { name: "Mohamed MORRIS", email: "parent4@smartkids.local" },
    { name: "Hassan NOURI", email: "parent5@smartkids.local" },
  ];

  const parents = [];
  for (let i = 0; i < 5; i++) {
    const user = await upsertUserWithPassword(
      parentNames[i].email,
      parentNames[i].name,
      "PARENT",
      org.id
    );

    const profile = await prisma.parent.upsert({
      where: { userId: user.id },
      update: {
        phone: `+212 6 00 00 00 0${i + 1}`,
      },
      create: {
        userId: user.id,
        phone: `+212 6 00 00 00 0${i + 1}`,
        organizationId: org.id,
      },
    });

    parents.push({ user, profile });
  }
  console.log("✓ Parents created");

  // Link parents to children (2 children per parent, 8 children total)
  for (let i = 0; i < 8; i++) {
    const parentProfileId = parents[Math.floor(i / 2)].profile.id;
    const childId = children[i].id;
    const where = { parentId_childId: { parentId: parentProfileId, childId } };

    const existing = await prisma.parentChild.findUnique({ where });
    if (!existing) {
      await prisma.parentChild.create({
        data: {
          parentId: parentProfileId,
          childId,
          relationship: i % 2 === 0 ? "PERE" : "MERE",
          isPrimary: true,
          authorizedForPickup: true,
        },
      });
    }
  }
  console.log("✓ Parent-child relationships established");

  // Create subscription for the organization (14-day trial)
  const existingSub = await prisma.subscription.findFirst({
    where: { organizationId: org.id },
  });
  if (!existingSub) {
    const essentialPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: PLAN_NAMES.ESSENTIAL },
    });
    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId: essentialPlan!.id,
        status: SUBSCRIPTION_STATUS.TRIAL,
        billingPeriod: "MONTHLY",
        trialStart: new Date(),
        trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log("✓ Organization subscription created");

  console.log("\n========================================");
  console.log("Database seeded successfully!");
  console.log("========================================\n");
  console.log("Demo credentials:");
  console.log("  Super Admin: admin@smartkids.local / Demo123!");
  console.log("  Admin:       admin-center@smartkids.local / Demo123!");
  console.log("  Manager:     manager@smartkids.local / Demo123!");
  console.log("  Teacher:     teacher1@smartkids.local / Demo123!");
  console.log("  Accountant:  accountant@smartkids.local / Demo123!");
  console.log("  Parent:      parent1@smartkids.local / Demo123!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
