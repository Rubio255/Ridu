import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { kidsShare, standardTripValue } from "./pricing";
import { PLAN_NAMES, type PlanId, type Settings } from "./settings";
import { notifyOwner } from "./push";

// Kliento mėnesio kelionių standartinė vertė pagal galiojančius abonementus (planui parinkti)
export async function clientMonthlyValue(s: Settings, profileId: string) {
  const { data } = await supabaseAdmin().from("subscriptions").select("weekdays, extra_kids, standard_trip_eur, drive_min, km, passenger_type")
    .eq("payer_id", profileId).in("status", ["active", "pending"]);
  const v = (data ?? []).reduce((a, x) => {
    const car = x.standard_trip_eur != null ? Number(x.standard_trip_eur) : standardTripValue(s, x.drive_min, Number(x.km), x.passenger_type);
    const n = 1 + x.extra_kids;
    return a + car * kidsShare(s, n) * n * x.weekdays.length * 52 / 12;
  }, 0);
  return { value: Math.round(v), trips: (data ?? []).reduce((a, x) => a + x.weekdays.length, 0), subs: data ?? [] };
}

export async function planState(profileId: string) {
  const { data } = await supabaseAdmin().from("profiles").select("id, plan_id, plan_since, plan_request").eq("id", profileId).single();
  return data as { id: string; plan_id: string | null; plan_since: string | null; plan_request: string | null } | null;
}

// Kliento pasirinktas planas laukia savininko patvirtinimo. Tas pats jau galiojantis planas neišsaugomas iš naujo.
export async function savePlanRequest(profileId: string, plan: string) {
  if (!["basic", "family", "premium"].includes(plan)) return false;
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("role, full_name, email, plan_id, plan_request").eq("id", profileId).single();
  if (!p || p.role !== "client" || (p.plan_id === plan && !p.plan_request) || p.plan_request === plan) return false;
  await db.from("profiles").update({ plan_request: plan }).eq("id", profileId);
  const name = PLAN_NAMES[plan as PlanId];
  await notifyOwner("Klientas pasirinko planą", `${p.full_name || p.email}: ${name}. Patvirtinkite skiltyje „Klientai“.`, "/savininkas/klientai");
  return true;
}
