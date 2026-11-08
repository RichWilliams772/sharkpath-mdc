import type { Wages } from "./types";

// Real wage data from the BLS public API (Occupational Employment and Wage Statistics).
// Series IDs: OEU + N (national) / M (metro) + area + industry 000000 + SOC (6 digits) + datatype.
// Datatypes: 12 = annual 25th percentile, 13 = annual median.
// Without a key BLS allows 25 requests/day, so results are memoized per process; set BLS_API_KEY for 500/day.

const MIAMI_MSA = "0033100";
const NATIONAL = "0000000";
const cache = new Map<string, Wages>();

const series = (kind: "N" | "M", area: string, soc: string, dt: string) => `OEU${kind}${area}000000${soc.replace("-", "")}${dt}`;
export const isSoc = (s?: string): s is string => !!s && /^\d{2}-\d{4}$/.test(s);

export async function wagesFor(socs: string[]): Promise<Record<string, Wages>> {
  const wanted = [...new Set(socs.filter(isSoc))];
  const out: Record<string, Wages> = {};
  const missing = wanted.filter((s) => (cache.has(s) ? ((out[s] = cache.get(s)!), false) : true));
  if (!missing.length) return out;

  const ids = missing.flatMap((s) => [series("N", NATIONAL, s, "13"), series("N", NATIONAL, s, "12"), series("M", MIAMI_MSA, s, "13")]);
  try {
    const res = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data/", {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seriesid: ids.slice(0, 50), latest: true, ...(process.env.BLS_API_KEY && { registrationkey: process.env.BLS_API_KEY }) }),
    });
    const data = await res.json();
    const val = (id: string) => {
      const row = data?.Results?.series?.find((x: { seriesID: string }) => x.seriesID === id)?.data?.[0];
      const n = row ? Number(row.value) : NaN;
      return { n: Number.isFinite(n) ? n : undefined, year: row?.year as string | undefined };
    };
    for (const s of missing) {
      const med = val(series("N", NATIONAL, s, "13"));
      const w: Wages = { soc: s, year: med.year, nationalMedian: med.n, national25: val(series("N", NATIONAL, s, "12")).n, miamiMedian: val(series("M", MIAMI_MSA, s, "13")).n };
      if (w.nationalMedian) cache.set(s, w);
      out[s] = w;
    }
  } catch (e) {
    console.warn("BLS lookup failed —", (e as Error).message);
  }
  return out;
}
