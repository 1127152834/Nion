import { formatDistanceToNow } from "date-fns";
import { enUS as dateFnsEnUS, zhCN as dateFnsZhCN } from "date-fns/locale";

import { getLocaleFromCookie } from "../i18n/cookies.ts";
import { detectLocale, type Locale } from "../i18n/locale.ts";

function getDateFnsLocale(locale: Locale) {
  switch (locale) {
    case "zh-CN":
      return dateFnsZhCN;
    case "en-US":
    default:
      return dateFnsEnUS;
  }
}

function toValidDate(
  date: Date | string | number | null | undefined,
): Date | null {
  if (date == null) {
    return null;
  }

  if (typeof date === "string" && date.trim() === "") {
    return null;
  }

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function formatTimeAgo(
  date: Date | string | number | null | undefined,
  locale?: Locale,
) {
  const parsedDate = toValidDate(date);
  if (!parsedDate) {
    return "";
  }

  const effectiveLocale =
    locale ??
    (getLocaleFromCookie() as Locale | null) ??
    // Fallback when cookie is missing (or on first render)
    detectLocale();
  return formatDistanceToNow(parsedDate, {
    addSuffix: true,
    locale: getDateFnsLocale(effectiveLocale),
  });
}
