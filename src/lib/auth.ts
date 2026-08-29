import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, admin, twoFactor } from "better-auth/plugins";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    // Secure, HTTP‑only cookie with strict SameSite policy
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  },
  plugins: [
    organization({
      allowMultiple: true,
      creatorRole: "ADMIN",
      memberRoles: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT", "PARENT"],
    }),
    admin({
      roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT", "PARENT"],
      defaultRole: "PARENT",
      adminRoles: ["SUPER_ADMIN", "ADMIN"],
    }),
    twoFactor({ totp: true }),
  ],
  advanced: {
    crossSubDomainCookies: { enabled: true },
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  trustedOrigins: ["http://localhost:3000", "https://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;