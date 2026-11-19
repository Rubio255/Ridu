// Kelionės kainos skaičiavimas. Visi tarifai ateina iš pricing_settings lentelės.

export type PricingSettings = {
  base_fee: number;
  per_km: number;
  min_price: number;
  included_wait_min: number;
  per_wait_min: number;
  extra_child_fee: number;
  peak_surcharge_pct: number;
};

export type TripQuoteInput = {
  km: number;
  waitMin?: number;
  extraChildren?: number;
  isPeak?: boolean;
};

export type TripQuote = {
  total: number;
  lines: { label: string; amount: number }[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quoteTrip(s: PricingSettings, input: TripQuoteInput): TripQuote {
  const lines: TripQuote["lines"] = [];
  lines.push({ label: "Paėmimo mokestis", amount: s.base_fee });
  lines.push({ label: `Atstumas ${input.km.toFixed(1)} km`, amount: round2(input.km * s.per_km) });

  const paidWait = Math.max(0, (input.waitMin ?? 0) - s.included_wait_min);
  if (paidWait > 0) lines.push({ label: `Laukimas ${paidWait} min`, amount: round2(paidWait * s.per_wait_min) });

  const extra = input.extraChildren ?? 0;
  if (extra > 0) lines.push({ label: `Papildomi vaikai (${extra})`, amount: round2(extra * s.extra_child_fee) });

  let subtotal = lines.reduce((a, l) => a + l.amount, 0);
  if (input.isPeak && s.peak_surcharge_pct > 0) {
    const p = round2((subtotal * s.peak_surcharge_pct) / 100);
    lines.push({ label: `Piko priemoka ${s.peak_surcharge_pct}%`, amount: p });
    subtotal += p;
  }
  if (subtotal < s.min_price) {
    lines.push({ label: "Iki minimalios kainos", amount: round2(s.min_price - subtotal) });
    subtotal = s.min_price;
  }
  return { total: round2(subtotal), lines };
}

// Atstumo įvertis be išorinių paslaugų: tiesi linija × miesto kelių koeficientas.
// Vėliau galima pakeisti tikru maršrutu (OSRM / Google).
export function estimateRoadKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const straight = 2 * R * Math.asin(Math.sqrt(h));
  return Math.max(1, Math.round(straight * 1.35 * 10) / 10);
}

// Vilniaus vidutinis greitis piko metu ~22 km/h
export function estimateMinutes(km: number): number {
  return Math.max(5, Math.round((km / 22) * 60));
}
