import { prisma } from "@/lib/prisma";
import { PLAN_CONFIGS, SUBSCRIPTION_STATUS, TRIAL_DAYS } from "./plan-config";

/**
 * Creates a subscription for an organization.
 * Defaults to TRIAL status with Essential plan.
 */
export async function createSubscription(orgId: string, planName = "ESSENTIAL") {
  const planConfig = PLAN_CONFIGS[planName as "ESSENTIAL" | "PRO" | "PREMIUM"];
  if (!planConfig) {
    throw new Error("Invalid plan name");
  }

  const now = new Date();

  // For first subscription, give a trial period
  const hasActiveSubscription = await prisma.subscription.findFirst({
    where: { organizationId: orgId, status: { in: ["ACTIVE", "TRIAL"] } },
  });

  const isTrial = !hasActiveSubscription;
  const trialEnd = isTrial ? new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : null;

  const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return await prisma.subscription.create({
    data: {
      organizationId: orgId,
      planId: planName.toLowerCase(),
      status: isTrial ? SUBSCRIPTION_STATUS.TRIAL : SUBSCRIPTION_STATUS.ACTIVE,
      billingPeriod: "MONTHLY",
      trialStart: isTrial ? now : undefined,
      trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd,
    },
    include: { plan: true },
  });
}

/**
 * Get active subscription for an organization
 */
export async function getActiveSubscription(orgId: string) {
  return prisma.subscription.findFirst({
    where: {
      organizationId: orgId,
      status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
      currentPeriodEnd: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
}

/**
 * Check if organization has an active subscription
 */
export async function hasActiveSubscription(orgId: string): Promise<boolean> {
  const sub = await getActiveSubscription(orgId);
  return !!sub;
}

/**
 * Get feature limits for an organization based on their subscription
 */
export async function getOrganizationFeatureLimits(orgId: string, role: string) {
  const sub = await getActiveSubscription(orgId);
  const planName = sub?.planId?.toUpperCase() as PlanName ?? "ESSENTIAL";
  return getFeatureLimits(role, planName);
}

/**
 * Count current usage for an organization
 */
export async function getOrganizationUsage(orgId: string) {
  const [children, staff, parents, classes] = await Promise.all([
    prisma.child.count({ where: { organizationId: orgId, deletedAt: null, status: "ACTIVE" } }),
    prisma.staffProfile.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
    prisma.parent.count({ where: { organizationId: orgId } }),
    prisma.class.count({ where: { organizationId: orgId, status: "ACTIVE" } }),
  ]);

  return { children, staff, parents, classes };
}

/**
 * Check if an organization is within a usage limit
 */
export async function checkUsageLimit(orgId: string, resource: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limits = await getOrganizationFeatureLimits(orgId, "ADMIN");
  if (!limits) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const usage = await getOrganizationUsage(orgId);
  const current = usage[resource as keyof typeof usage] ?? 0;
  const limit = limits[resource as keyof typeof limits] as number;

  return {
    allowed: current < limit,
    current,
    limit,
  };
}

/**
 * Verify subscription status (graceful restriction)
 */
export function getSubscriptionStatusInfo(subscription: { status: string; trialEnd: Date | null; currentPeriodEnd: Date }) {
  const now = new Date();

  if (subscription.status === "EXPIRED" || subscription.status === "CANCELLED") {
    return { active: false, reason: "expired", fr: "Abonnement expiré" };
  }

  if (subscription.status === "TRIAL") {
    if (subscription.trialEnd && now > subscription.trialEnd) {
      return { active: false, reason: "trial-expired", fr: "Période d'essai expirée" };
    }
    return { active: true, reason: "trial", fr: "Essai gratuit" };
  }

  if (subscription.status === "PAST_DUE") {
    return { active: false, reason: "past-due", fr: "Paiement en retard" };
  }

  // ACTIVE or default
  if (now > subscription.currentPeriodEnd) {
    return { active: false, reason: "period-ended", fr: "Période de facturation expirée" };
  }

  return { active: true, reason: "active", fr: "Actif" };
}