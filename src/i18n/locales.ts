export const SUPPORTED_LOCALES = ["fr", "en", "ar"] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];
