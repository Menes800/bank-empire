export const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "NOK",
  maximumFractionDigits: 0,
});

export const compact = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
