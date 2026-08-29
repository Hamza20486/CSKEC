import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "@/lib/prisma"; // placeholder – will be defined later

export type AuthenticatedSession = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string | null;
    emailVerified: boolean;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
  };
};

export const SESSION_COOKIE_NAME = "better-auth.session_token";

/** Get the current session – redirects to /auth/signin if missing */
export async function requireAuth(): Promise<AuthenticatedSession> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/auth/signin");
  return session as unknown as AuthenticatedSession;
}

/** Role guard */
export async function requireRole(...allowed: string[]): Promise<AuthenticatedSession> {
  const sess = await requireAuth();
  if (!allowed.includes(sess.user.role)) redirect("/403");
  return sess;
}

/** Org guard – SUPER_ADMIN can access any */
export async function requireOrganizationAccess(orgId: string): Promise<AuthenticatedSession> {
  const sess = await requireAuth();
  if (sess.user.role === "SUPER_ADMIN") return sess;
  if (!sess.user.organizationId || sess.user.organizationId !== orgId) redirect("/403");
  return sess;
}

/** Child guard – PARENT can only access linked children; TEACHER via class; ADMIN/SUPER can access all */
export async function requireChildAccess(childId: string) {
  const sess = await requireAuth();
  const child = await prisma.child.findUnique({ where: { id: childId }, include: { class: true } });
  if (!child) redirect("/404");
  const role = sess.user.role;
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER") return { ...sess, child };
  if (role === "PARENT") {
    const link = await prisma.parentChild.findFirst({ where: { childId, parentId: sess.user.id } });
    if (!link) redirect("/403");
    return { ...sess, child };
  }
  if (role === "TEACHER") {
    const ct = await prisma.classTeacher.findFirst({ where: { userId: sess.user.id, classId: child.classId } });
    if (!ct) redirect("/403");
    return { ...sess, child };
  }
  redirect("/403");
}

/** Class guard – TEACHER must be assigned */
export async function requireClassAccess(classId: string) {
  const sess = await requireAuth();
  const role = sess.user.role;
  if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "MANAGER") {
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (!cls) redirect("/404");
    return { ...sess, class: cls };
  }
  if (role === "TEACHER") {
    const ct = await prisma.classTeacher.findFirst({ where: { userId: sess.user.id, classId } });
    if (!ct) redirect("/403");
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    return { ...sess, class: cls };
  }
  redirect("/403");
}

export function isSuperAdmin(role: string) { return role === "SUPER_ADMIN"; }
export function isManager(role: string) { return ["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(role); }
export function isStaff(role: string) { return role !== "PARENT"; }
export function canManageChildren(role: string) { return ["SUPER_ADMIN", "ADMIN", "MANAGER", "TEACHER"].includes(role); }
export function canManageFinance(role: string) { return ["SUPER_ADMIN", "ADMIN", "MANAGER", "ACCOUNTANT"].includes(role); }
export function isParent(role: string) { return role === "PARENT"; }