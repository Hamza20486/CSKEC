// Centralized SaaS plan configuration
// Prices in MAD (whole numbers)

export const PLAN_NAMES = {
  ESSENTIAL: "ESSENTIAL",
  PRO: "PRO",
  PREMIUM: "PREMIUM",
} as const;

export type PlanName = (typeof PLAN_NAMES)[keyof typeof PLAN_NAMES];

export interface PlanConfig {
  id: string;
  name: PlanName;
  displayName: { fr: string };
  description: { fr: string };
  priceMAD: number; // Monthly price in MAD
  yearlyDiscount: number; // Percentage discount (0-1)
  features: {
    maxChildren: number;
    maxStaffUsers: number;
    maxParentUsers: number;
    maxClasses: number;
    storageLimitGB: number;
    advancedAnalytics: boolean;
    customBranding: boolean;
  };
}

export const PLAN_CONFIGS: Record<PlanName, PlanConfig> = {
  ESSENTIAL: {
    id: "essential",
    name: PLAN_NAMES.ESSENTIAL,
    displayName: { fr: "Essentiel" },
    description: {
      fr: "Idéal pour les petites structures. Inclut la gestion des enfants, des classes et des activités.",
    },
    priceMAD: 299,
    yearlyDiscount: 0.1,
    features: {
      maxChildren: 50,
      maxStaffUsers: 10,
      maxParentUsers: 100,
      maxClasses: 5,
      storageLimitGB: 5,
      advancedAnalytics: false,
      customBranding: false,
    },
  },
  PRO: {
    id: "pro",
    name: PLAN_NAMES.PRO,
    displayName: { fr: "Professionnel" },
    description: {
      fr: "Parfait pour les écoles établies. Toutes les fonctionnalités d'Essentiel, plus les rapports avancés et les notifications personnalisées.",
    },
    priceMAD: 499,
    yearlyDiscount: 0.15,
    features: {
      maxChildren: 200,
      maxStaffUsers: 50,
      maxParentUsers: 500,
      maxClasses: 20,
      storageLimitGB: 20,
      advancedAnalytics: true,
      customBranding: true,
    },
  },
  PREMIUM: {
    id: "premium",
    name: PLAN_NAMES.PREMIUM,
    displayName: { fr: "Premium" },
    description: {
      fr: "Solution complète pour les réseaux d'écoles. Inclut tout le fonctionnalité de Pro, plus le support prioritaire et les intégrations avancées.",
    },
    priceMAD: 799,
    yearlyDiscount: 0.2,
    features: {
      maxChildren: 1000,
      maxStaffUsers: 200,
      maxParentUsers: 2000,
      maxClasses: 100,
      storageLimitGB: 100,
      advancedAnalytics: true,
      customBranding: true,
    },
  },
};

export const SUBSCRIPTION_STATUS = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  PAST_DUE: "PAST_DUE",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const SUBSCRIPTION_STATUS_FR = {
  TRIAL: "Essai",
  ACTIVE: "Actif",
  PAST_DUE: "En retard",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
} as const;

export const TRIAL_DAYS = 14;

export function getPlanConfig(planName: string): PlanConfig | undefined {
  return PLAN_CONFIGS[planName as PlanName];
}

export function getAllPlans(): PlanConfig[] {
  return Object.values(PLAN_CONFIGS);
}

export function getFeatureLimits(role: string, planName: string): PlanConfig["features"] | null {
  // SUPER_ADMIN can access everything
  if (role === "SUPER_ADMIN") {
    return {
      maxChildren: Infinity,
      maxStaffUsers: Infinity,
      maxParentUsers: Infinity,
      maxClasses: Infinity,
      storageLimitGB: Infinity,
      advancedAnalytics: true,
      customBranding: true,
    };
  }
  const config = getPlanConfig(planName);
  return config ? config.features : null;
}