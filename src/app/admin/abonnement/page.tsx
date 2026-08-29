import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAllPlans, getPlanConfig } from "@/lib/saas/plan-config";
import { getOrganizationUsage, getSubscriptionStatusInfo } from "@/lib/saas/subscription-service";

export const dynamic = "force-dynamic";

export default async function AbonnementPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !session.user.organizationId) {
    redirect("/auth/signin");
  }

  // Only ADMIN/MANAGER can view org subscription
  if (!["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/403");
  }

  const orgId = session.user.organizationId;

  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  const usage = await getOrganizationUsage(orgId);
  const plans = getAllPlans();

  const info = subscription
    ? getSubscriptionStatusInfo({
        status: subscription.status,
        trialEnd: subscription.trialEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
      })
    : null;

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
        Votre Abonnement
      </h1>

      {/* Current Subscription Card */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Abonnement Actuel
        </h2>
        {subscription ? (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {getPlanConfig(subscription.planId?.toUpperCase() as "ESSENTIAL" | "PRO" | "PREMIUM")?.displayName.fr ??
                    subscription.planId}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Statut :{" "}
                  <span
                    className={`font-medium ${
                      info?.active ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {info?.fr ?? subscription.status}
                  </span>
                </p>
                {subscription.trialEnd && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Fin de la période d’essai :{" "}
                    {new Date(subscription.trialEnd).toLocaleDateString("fr-FR")}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Prochaine échéance :{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  info?.active
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {info?.fr ?? "Inconnu"}
              </span>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm bg-white dark:bg-gray-800">
            <p className="text-gray-700 dark:text-gray-300">Aucun abonnement actif.</p>
            <button
              onClick={() => alert("Contactez l’administrateur pour créer un abonnement.")}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Demander un abonnement
            </button>
          </div>
        )}
      </section>

      {/* Usage Summary */}
      {subscription && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
            Utilisation Actuelle
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Enfants", value: usage.children },
              { label: "Personnel", value: usage.staff },
              { label: "Parents", value: usage.parents },
              { label: "Classes", value: usage.classes },
            ].map((item) => (
              <div
                key={item.label}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center bg-white dark:bg-gray-800"
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{item.value}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Plan Comparison */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
          Comparer les Plans
        </h2>
        <div className="space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm bg-white dark:bg-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    {plan.displayName.fr}
                  </h3>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {plan.priceMAD} Dh/mois
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <li>• Jusqu'à {plan.features.maxChildren} enfants</li>
                    <li>• Jusqu'à {plan.features.maxStaffUsers} membres du personnel</li>
                    <li>• Jusqu'à {plan.features.maxParentUsers} parents</li>
                    <li>• Jusqu'à {plan.features.maxClasses} classes</li>
                    <li>• {plan.features.storageLimitGB} Go de stockage</li>
                    <li>• {plan.features.advancedAnalytics ? "Analyses avancées" : "Analyses de base"}</li>
                    <li>• {plan.features.customBranding ? "Personnalisation" : "Pas de personnalisation"}</li>
                  </ul>
                </div>
                <button
                  disabled={subscription?.planId === plan.name.toLowerCase()}
                  onClick={() =>
                    alert("Pour changer de plan, contactez l’administrateur.")
                  }
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    subscription?.planId === plan.name.toLowerCase()
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 cursor-default"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  {subscription?.planId === plan.name.toLowerCase()
                    ? "Plan actuel"
                    : "Changer de plan"}
                </button>
              </div>
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
