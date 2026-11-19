// Platformos mokestis šeimai (sąlygų 4 p.): skaičiuojamas proporcingai sutarties dienoms mėnesyje,
// nebeskaičiuojamas nuo sutarties pabaigos ir neimamas, jei visas mėnesio keliones atšaukė teikėjas.
// Šeima – vaiko globėjų rinkinys. Jei sutartis moka keli globėjai, mokestis dalijamas po lygiai.

export type FeeSub = { id: string; child_id: string; payer_id: string; status: string; starts_on: string | null; ends_on: string | null };
export type FeeTrip = { subscription_id: string | null; status: string; credit_eur: number | null };
export type FamilyFee = { key: string; days: number; daysInMonth: number; provider: boolean; fee: number; payers: string[]; share: number };

const r2 = (x: number) => Math.round(x * 100) / 100;

export function familyKey(guardians: string[]) {
  return [...guardians].sort().join("+");
}

/** month – "YYYY-MM"; guardiansByChild – vaiko id → globėjų id; trips – to mėnesio kelionės */
export function familyFees(month: string, fee: number, subs: FeeSub[], trips: FeeTrip[], guardiansByChild: Map<string, string[]>): FamilyFee[] {
  const [y, m] = month.split("-").map(Number);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const ms = `${month}-01`, me = `${month}-${String(dim).padStart(2, "0")}`;
  const fam = new Map<string, { days: boolean[]; payers: Set<string>; subs: Set<string> }>();
  for (const s of subs) {
    if (!["active", "ended"].includes(s.status) || !s.starts_on) continue;
    const a = s.starts_on > ms ? s.starts_on : ms;
    const b = s.status === "ended" && s.ends_on && s.ends_on < me ? s.ends_on : me;
    if (a > b) continue;
    const key = familyKey(guardiansByChild.get(s.child_id) ?? [s.payer_id]);
    const f = fam.get(key) ?? { days: new Array<boolean>(dim).fill(false), payers: new Set(), subs: new Set() };
    for (let d = Number(a.slice(8)); d <= Number(b.slice(8)); d++) f.days[d - 1] = true;
    f.payers.add(s.payer_id); f.subs.add(s.id); fam.set(key, f);
  }
  return [...fam.entries()].map(([key, f]) => {
    const ts = trips.filter((t) => t.subscription_id && f.subs.has(t.subscription_id));
    const provider = ts.length > 0 && ts.every((t) => t.status === "cancelled") && ts.some((t) => Number(t.credit_eur ?? 0) > 0);
    const days = f.days.filter(Boolean).length, total = provider ? 0 : r2(fee * days / dim);
    return { key, days, daysInMonth: dim, provider, fee: total, payers: [...f.payers], share: r2(total / f.payers.size) };
  });
}

export const feeForPayer = (fees: FamilyFee[], payer: string) => r2(fees.filter((f) => f.payers.includes(payer)).reduce((a, f) => a + f.share, 0));
