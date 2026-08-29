import { auth } from "@/lib/auth";

export type AppUser = typeof auth.$Infer.User;
export type AppSession = typeof auth.$Infer.Session;
