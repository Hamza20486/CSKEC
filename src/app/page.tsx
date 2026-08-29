import { redirect } from "next/navigation";

export default function RootPage() {
  // Server‑side redirect to the default locale (French)
  redirect("/fr");
  return null; // Unreachable, but required for type safety
}