import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";

// Define the supported locales
export const locales = ["fr", "ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming `requestLocale` is valid
  const locale = locales.includes(requestLocale as Locale)
    ? (requestLocale as Locale)
    : defaultLocale;

  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    return {
      locale,
      messages,
      timeZone: "Africa/Casablanca",
      formats: {
        dateTime: {
          short: {
            day: "numeric",
            month: "short",
            year: "numeric",
          },
          long: {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          },
        },
        date: {
          short: {
            day: "numeric",
            month: "short",
            year: "numeric",
          },
        },
        currency: {
          MAD: {
            style: "currency",
            currency: "MAD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        },
      },
    };
  } catch {
    notFound();
  }
});
