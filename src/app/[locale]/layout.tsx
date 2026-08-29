import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

export const metadata: Metadata = {
  title: "Smart Kids Education Care",
  description: "Gestion des enfants et des écoles",
};

const inter = Inter({ subsets: ["latin"] });

export default async function LocaleLayout(
  props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }
) {
  const { locale } = await props.params;
  if (!SUPPORTED_LOCALES.includes(locale as any)) {
    notFound();
  }
  // No <html>/<body> – root layout already provides them
  return <>{props.children}</>;
}
