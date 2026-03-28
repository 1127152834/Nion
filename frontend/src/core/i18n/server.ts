import { getLocaleFromCookie } from "./cookies";
import { normalizeLocale, type Locale } from "./locale";

export function detectLocaleServer(): Locale {
  if (typeof window !== "undefined") {
    const cookieLocale = getLocaleFromCookie();
    if (cookieLocale) {
      return normalizeLocale(cookieLocale);
    }

    return normalizeLocale(window.navigator.language);
  }

  return normalizeLocale(null);
}
