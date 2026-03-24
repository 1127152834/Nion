import { normalizeLocale, type Locale } from "./locale";
import { getLocaleFromCookie } from "./cookies";

export async function detectLocaleServer(): Promise<Locale> {
  if (typeof window !== "undefined") {
    const cookieLocale = getLocaleFromCookie();
    if (cookieLocale) {
      return normalizeLocale(cookieLocale);
    }

    return normalizeLocale(window.navigator.language);
  }

  return normalizeLocale(null);
}
