import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function LocalePage() {
  const t = await getTranslations("Footer.home");

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Smart Kids Education Care
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          {t()}
        </p>

        <div className="space-y-4">
          <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md">
            Accueil
          </Link>

          <Link href="/admin" className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md">
            Tableau de bord
          </Link>

          <Link href="/admin/abonnement" className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md">
            Mon abonnement
          </Link>

          <Link href="/admin/saas/subscriptions" className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md">
            Gestion des abonnements (Super Admin)
          </Link>
        </div>

        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Statut de l'application
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Locale actuel: <span className="font-medium"></span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fuseau horaire: Africa/Casablanca
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Version: 1.0.0
          </p>
        </div>
      </div>
    </main>
  );
}