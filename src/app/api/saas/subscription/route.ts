import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllPlans, getPlanConfig, PLAN_NAMES, SUBSCRIPTION_STATUS } from "@/lib/saas/plan-config";
import { getOrganizationUsage } from "@/lib/saas/subscription-service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const orgId = req.nextUrl.searchParams.get("organizationId");
    const currentOrgId = session.user.organizationId;

    let targetOrgId: string | null = null;

    if (session.user.role === "SUPER_ADMIN") {
      targetOrgId = orgId ?? currentOrgId;
    } else {
      targetOrgId = currentOrgId;
    }

    if (!targetOrgId) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 });
    }

    const subscription = await prisma.subscription.findFirst({
      where: { organizationId: targetOrgId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    const usage = await getOrganizationUsage(targetOrgId);
    const plan = getPlanConfig((subscription?.plan?.name?.toUpperCase() ?? "ESSENTIAL") as "ESSENTIAL" | "PRO" | "PREMIUM");

    return NextResponse.json({
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            plan: subscription.planId,
            billingPeriod: subscription.billingPeriod,
            trialStart: subscription.trialStart,
            trialEnd: subscription.trialEnd,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancellationDate: subscription.cancellationDate,
            renewalDate: subscription.renewalDate,
          }
        : null,
      plans: getAllPlans(),
      usage,
      limits: plan ? plan.features : null,
    });
  } catch (error) {
    console.error("[GET /api/saas/subscription]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();

    const orgId = body?.organizationId;
    const planName = body?.plan;

    if (!orgId || !planName) {
      return NextResponse.json({ error: "organizationId et plan requis" }, { status: 400 });
    }

    const validPlan = getPlanConfig(planName);
    if (!validPlan) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const existing = await prisma.subscription.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: planName.toLowerCase(),
          status: SUBSCRIPTION_STATUS.ACTIVE,
        },
      });
      return NextResponse.json({ success: true });
    } else {
      const now = new Date();
      await prisma.subscription.create({
        data: {
          organizationId: orgId,
          planId: planName.toLowerCase(),
          status: SUBSCRIPTION_STATUS.TRIAL,
          billingPeriod: "MONTHLY",
          trialStart: now,
          trialEnd: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("[POST /api/saas/subscription]", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
