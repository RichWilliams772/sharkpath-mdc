const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export const formatMoney = (n: number) => money.format(n);
export const formatCompactMoney = (n: number) => compact.format(n);
export const formatYears = (n: number) => `${Math.round(n * 10) / 10} yr${n === 1 ? "" : "s"}`;
