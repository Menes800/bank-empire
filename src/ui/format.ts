import type { CurrencyCode } from "../game/types";

let activeCurrency: CurrencyCode = "NOK";
let activeLocale = "nb-NO";

const currencySymbols: Record<CurrencyCode, string> = {
  NOK: "kr",
  SEK: "kr",
  DKK: "kr",
  EUR: "€",
  GBP: "£",
  USD: "$",
  CHF: "CHF",
  JPY: "¥",
};

export function setMoneyContext(currency: CurrencyCode, locale: string) {
  activeCurrency = currency;
  activeLocale = locale || "en-GB";
}

function compactNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

function affix(value: string, currency: CurrencyCode) {
  const symbol = currencySymbols[currency];
  if (currency === "NOK" || currency === "SEK" || currency === "DKK" || currency === "CHF") return `${value} ${symbol}`;
  return `${symbol}${value}`;
}

export function formatMoney(value: number, currency: CurrencyCode = activeCurrency, locale = activeLocale) {
  const sign = value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  let display: string;
  if (absolute >= 1_000_000_000) display = `${compactNumber(absolute / 1_000_000_000, locale)}bn`;
  else if (absolute >= 1_000_000) display = `${compactNumber(absolute / 1_000_000, locale)}m`;
  else if (absolute >= 1_000) display = `${compactNumber(absolute / 1_000, locale)}k`;
  else display = Math.round(absolute).toLocaleString(locale);
  return `${sign}${affix(display, currency)}`;
}

export const money = {
  format(value: number) {
    return formatMoney(value);
  },
};

export const fullMoney = {
  format(value: number) {
    const rounded = Math.round(value / 10_000) * 10_000;
    const sign = rounded < 0 ? "−" : "";
    return `${sign}${affix(Math.abs(rounded).toLocaleString(activeLocale), activeCurrency)}`;
  },
};

export const compact = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
