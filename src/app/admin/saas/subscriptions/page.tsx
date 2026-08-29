import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllPlans, getPlanConfig } from "@/lib/saas/plan-config";
import { getSubscriptionStatusInfo } from "@/lib/saas/subscription-service";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/403");
  }

  const subscriptions = await prisma.subscription.findMany({
    include: { organization: true },
    orderBy: { createdAt: "desc" },
  });

  const plans = getAllPlans();

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Gestion des Abonnements SaaS
      </h1>

      {/* Active Subscriptions */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Abonnements Actifs
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Organisation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Période d'essai
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fin de période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {subscriptions.map((sub) => {
                const info = getSubscriptionStatusInfo({
                  status: sub.status,
                  trialEnd: sub.trialEnd,
                  currentPeriodEnd: sub.currentPeriodEnd,
                });
                const plan = getPlanConfig(sub.planId?.toUpperCase() as "ESSENTIAL" | "PRO" | "PREMIUM");
                return (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {sub.organization?.name ?? "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {plan?.displayName.fr ?? sub.planId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          info.active
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {info.fr}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {sub.trialEnd ? new Date(sub.trialEnd).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/admin/saas/subscriptions/${sub.id}`}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        Gérer
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Plan Comparison */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Plans Disponibles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm bg-white dark:bg-gray-800"
            >
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {plan.displayName.fr}
              </h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {plan.priceMAD} Dh/mois
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 mb-6">
                <li>• Jusqu'à {plan.features.maxChildren} enfants</li>
                <li>• Jusqu'à {plan.features.maxStaffUsers} membres du personnel</li>
                <li>• Jusqu'à {plan.features.maxClasses} classes</li>
                <li>• {plan.features.storageLimitGB} Go de stockage</li>
                <li>• {plan.features.advancedAnalytics ? "Analyses avancées incluses" : "Analyses de base"}</li>
              </ul>
              <button
                onClick={() => {
                  // This is intentionally a placeholder for future payment integration
                  alert("Paiement en ligne bientôt disponible.");
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Sélectionner
              </button>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
        Le paiement en ligne sera bientôt disponible. Contactez l'administrateur pour les changements de plan.
      </p>
    </main>
  );
}
