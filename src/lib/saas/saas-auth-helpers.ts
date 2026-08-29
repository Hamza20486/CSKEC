import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the authenticated session or redirects to sign-in.
 */
export async function requireSaaSAuth() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/signin");
  return session;
}

/**
 * Require an active subscription for the user's organization.
 * Allows Super Admin and allows TRIAL / ACTIVE.
 * Blocks PAST_DUE / EXPIRED / CANCELLED (graceful restrictions).
 */
export async function requireActiveSubscription() {
  const session = await requireSaaSAuth();

  // Super Admin bypasses subscription checks
  if (session.user.role === "SUPER_ADMIN") return session;

  if (!session.user.organizationId) {
    redirect("/auth/signin");
  }

  const orgId = session.user.organizationId;
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    // No subscription exists. Only Super Admin can create one.
    if (session.user.role !== "SUPER_ADMIN") {
      redirect("/403");
    }
    return session;
  }

  // Allow active, trial, past-due (graceful). Block expired and cancelled.
  if (subscription.status === "EXPIRED" || subscription.status === "CANCELLED") {
    redirect("/admin/abonnement");
  }

  return session;
}

/**
 * Check if a feature is available for the current organization's subscription.
 */
export async function hasFeature(feature: string): Promise<boolean> {
  const session = await requireSaaSAuth();

  if (session.user.role === "SUPER_ADMIN") return true;
  if (!session.user.organizationId) return false;

  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: session.user.organizationId },
    include: { plan: true },
  });

  if (!subscription) return false;

  // Check based on plan features
  const planName = subscription.plan.name as "ESSENTIAL" | "PRO" | "PREMIUM";
  const features = PLAN_FEATURES[planName];
  if (!features) return false;

  const featureMap: Record<string, boolean> = {
    advancedAnalytics: features.advancedAnalytics,
    customBranding: features.customBranding,
  };

  return featureMap[feature] ?? false;
}

import { PLAN_CONFIGS } from "./plan-config";

const PLAN_FEATURES = {
  ESSENTIAL: PLAN_CONFIGS.ESSENTIAL.features,
  PRO: PLAN_CONFIGS.PRO.features,
  PREMIUM: PLAN_CONFIGS.PREMIUM.features,
};

/**
 * Super Admin can manage all subscriptions
 */
export function isSuperAdmin(role: string): boolean {
  return role === "SUPER_ADMIN";
}

/**
 * Admin can manage their organization's subscription
 */
export function canManageOrgSubscription(role: string, orgId: string, userOrgId: string | null): boolean {
  return isSuperAdmin(role) || (role === "ADMIN" && orgId === userOrgId);
}