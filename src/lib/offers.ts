import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { loadSettings } from "./auth";
import { loadDrivers, substitutesFor } from "./drivers";
import { notifyOwner, notifyProfiles, whenLt } from "./push";

export const OFFER_HOURS = 2;

// Siunčia pasiūlymą kitam laisvam vairuotojui (praleidžia tuos, kurie jau atsisakė ar neatsakė).
// Grąžina vairuotojo id arba null, jei laisvo vairuotojo nėra.
export async function offerNext(tripId: string, preferred?: string) {
  const db = supabaseAdmin();
  const [s, drivers, { data: t }, { data: past }] = await Promise.all([
    loadSettings(), loadDrivers(),
    db.from("trips").select("id, pickup_at, block_min, driver_id, status, to_label").eq("id", tripId).single(),
    db.from("trip_offers").select("driver_id, status").eq("trip_id", tripId),
  ]);
  if (!t || t.status !== "scheduled") return null;
  if ((past ?? []).some((o) => o.status === "pending")) return null;
  const tried = new Set((past ?? []).map((o) => o.driver_id));
  const subs = (await substitutesFor(s, drivers, t)).filter((d) => !tried.has(d.profile_id));
  const pick = subs.find((d) => d.profile_id === preferred) ?? subs[0];
  if (!pick) {
    await notifyOwner("Niekas nepriėmė kelionės", `${whenLt(t.pickup_at)} į ${t.to_label}: laisvo vairuotojo nėra. Atšaukite be mokesčio arba susisiekite su vairuotojais.`, "/savininkas/pakaitos");
    return null;
  }
  const expires = Math.min(Date.now() + OFFER_HOURS * 36e5, new Date(t.pickup_at).getTime() - 36e5);
  await db.from("trip_offers").insert({ trip_id: t.id, driver_id: pick.profile_id, expires_at: new Date(expires).toISOString() });
  await notifyProfiles([pick.profile_id], "Pasiūlymas perimti kelionę", `${whenLt(t.pickup_at)} į ${t.to_label}. Atsakykite aplikacijoje.`, "/vairuotojas");
  return pick.profile_id;
}

// Pasibaigusius pasiūlymus pažymi ir siūlo kitam (kviečiama cron ir puslapiuose)
export async function expireOffers() {
  const db = supabaseAdmin();
  const { data } = await db.from("trip_offers").update({ status: "expired", answered_at: new Date().toISOString() })
    .eq("status", "pending").lt("expires_at", new Date().toISOString()).select("trip_id");
  for (const o of data ?? []) await offerNext(o.trip_id);
  return (data ?? []).length;
}
