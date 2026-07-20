const number = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 1,
});

export const money = {
  format(value: number) {
    const sign = value < 0 ? "−" : "";
    const absolute = Math.abs(value);
    if (absolute >= 1_000_000_000) return `${sign}$${number.format(absolute / 1_000_000_000)}bn`;
    if (absolute >= 1_000_000) return `${sign}$${number.format(absolute / 1_000_000)}m`;
    if (absolute >= 1_000) return `${sign}$${number.format(absolute / 1_000)}k`;
    return `${sign}$${Math.round(absolute).toLocaleString("en-GB")}`;
  },
};

export const fullMoney = {
  format(value: number) {
    const rounded = Math.round(value / 10_000) * 10_000;
    const sign = rounded < 0 ? "−" : "";
    return `${sign}$${Math.abs(rounded).toLocaleString("en-GB")}`;
  },
};

export const compact = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
