import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { familyFees, familyKey } from "@/lib/fees";
import { countedPart, planById, planChain } from "@/lib/pricing";
import type { Settings } from "@/lib/settings";

const monthsFrom = (from: string, to: string) => {
  const out: string[] = [];
  for (let d = new Date(`${from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= to; d.setUTCMonth(d.getUTCMonth() + 1)) out.push(d.toISOString().slice(0, 7));
  return out;
};

/** Kredito plano sąskaita mėnesiui ("YYYY-MM"): kreditas leidžiamas standartine kelionių verte, likutis perkeliamas nuo plano pradžios. */
export async function loadPlanBill(s: Settings, c: { id: string; plan_id: string | null; plan_since: string | null }, month: string) {
  const p = planById(s, c.plan_id);
  if (!p) return null;
  const months = monthsFrom(c.plan_since ?? `${month}-01`, month);
  const end = new Date(`${month}-01T00:00:00Z`); end.setUTCMonth(end.getUTCMonth() + 1);
  const { data } = await supabaseAdmin().from("trips").select("pickup_at, price_eur, standard_eur, status, cancel_fee_pct, credit_eur")
    .eq("payer_id", c.id).gte("pickup_at", `${months[0]}-01T00:00:00Z`).lt("pickup_at", end.toISOString());
  const used = months.map((m) => (data ?? []).filter((t) => t.pickup_at.slice(0, 7) === m).reduce((a, t) => a + Number(t.standard_eur ?? t.price_eur) * countedPart(t), 0));
  return { p, bill: planChain(s, p, used).pop()! };
}

async function guardiansMap() {
  const { data } = await supabaseAdmin().from("child_guardians").select("child_id, profile_id");
  const m = new Map<string, string[]>();
  for (const r of data ?? []) m.set(r.child_id, [...(m.get(r.child_id) ?? []), r.profile_id]);
  return m;
}

/** Šio mėnesio platformos mokesčiai pagal šeimas. month – "YYYY-MM" */
export async function loadFamilyFees(month: string, fee: number) {
  const db = supabaseAdmin();
  const start = new Date(`${month}-01T00:00:00Z`), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  const [{ data: subs }, { data: trips }, g] = await Promise.all([
    db.from("subscriptions").select("id, child_id, payer_id, status, starts_on, ends_on").in("status", ["active", "ended"]),
    db.from("trips").select("subscription_id, status, credit_eur").gte("pickup_at", start.toISOString()).lt("pickup_at", end.toISOString()),
    guardiansMap(),
  ]);
  return familyFees(month, fee, subs ?? [], trips ?? [], g);
}

/** Ar šio vaiko šeima jau turi galiojančią sutartį (tada naujam užsakymui mokestis nepridedamas) */
export async function familyAlreadyPays(childId: string) {
  const g = await guardiansMap(), key = familyKey(g.get(childId) ?? []);
  const kids = [...g.entries()].filter(([, v]) => familyKey(v) === key).map(([k]) => k);
  const { count } = await supabaseAdmin().from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active").in("child_id", kids);
  return (count ?? 0) > 0;
}
