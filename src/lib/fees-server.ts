import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { familyFees, familyKey } from "@/lib/fees";

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
