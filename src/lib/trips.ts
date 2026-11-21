import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { loadSettings } from "./auth";
import { blockMin, driverShare, kidsShare, standardTripValue } from "./pricing";
import type { Settings } from "./settings";

// Vairuotojo procentas: individualus arba bendras nustatymas
async function pctByDriver(s: Settings) {
  const { data } = await supabaseAdmin().from("drivers").select("profile_id, payout_pct");
  return (id: string | null) => Number((data ?? []).find((d) => d.profile_id === id)?.payout_pct ?? s.driver_pct);
}

type SubValue = { standard_trip_eur: number | null; drive_min: number; km: number; passenger_type: "child" | "adult" | "senior"; extra_kids: number };
// Standartinė automobilio kelionės vertė (užfiksuota užsakant; senesniems abonementams skaičiuojama dabar)
const carValue = (s: Settings, sb: SubValue) => sb.standard_trip_eur != null ? Number(sb.standard_trip_eur) : standardTripValue(s, sb.drive_min, Number(sb.km), sb.passenger_type);
// Keleivių standartinė vertė: iš jos leidžiamas plano kreditas
const paxValue = (s: Settings, sb: SubValue) => Math.round(carValue(s, sb) * kidsShare(s, 1 + sb.extra_kids) * (1 + sb.extra_kids) * 100) / 100;

// Pakeitus kelionės vairuotoją, jo dalis perskaičiuojama pagal jo procentą
export async function reshareTrip(tripId: string, driverId: string) {
  const db = supabaseAdmin(), s = await loadSettings();
  const { data: t } = await db.from("trips").select("sub:subscriptions(standard_trip_eur, drive_min, km, passenger_type, extra_kids)").eq("id", tripId).single();
  const sb = t?.sub as unknown as SubValue | null;
  if (!sb) return;
  const pct = (await pctByDriver(s))(driverId);
  await db.from("trips").update({ driver_share_eur: driverShare(s, carValue(s, sb), pct) }).eq("id", tripId);
}
import { addDays, vilniusToday, vilniusToDate, weekday } from "./time";

// Sukuria abonementų keliones į priekį (tik serveryje, ne veiksmas klientui)
export async function generateTrips(subId?: string, days = 28) {
  const db = supabaseAdmin();
  let q = db.from("subscriptions").select("*, child:children(first_name), from:places!subscriptions_from_place_id_fkey(label,address), to:places!subscriptions_to_place_id_fkey(label,address)").eq("status", "active");
  if (subId) q = q.eq("id", subId);
  const { data: subs } = await q;
  const s = await loadSettings(), pctOf = await pctByDriver(s);
  const today = vilniusToday();
  const rows = [];
  for (const sb of subs ?? []) {
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i);
      if (d < sb.starts_on || (sb.ends_on && d > sb.ends_on) || !sb.weekdays.includes(weekday(d))) continue;
      const at = vilniusToDate(d, String(sb.pickup_time).slice(0, 5));
      if (at.getTime() < Date.now()) continue;
      rows.push({
        subscription_id: sb.id, child_id: sb.child_id, payer_id: sb.payer_id, driver_id: sb.driver_id,
        from_label: sb.from.label, to_label: sb.to.label, from_address: sb.from.address, to_address: sb.to.address,
        pickup_at: at.toISOString(), block_min: blockMin(s, sb.drive_min, sb.passenger_type), price_eur: Number(sb.per_trip_eur) * (1 + sb.extra_kids),
        // v7: vairuotojui visada procentas nuo standartinės vertės be PVM, saugoma kiekvienai kelionei
        standard_eur: paxValue(s, sb), driver_share_eur: driverShare(s, carValue(s, sb), pctOf(sb.driver_id)),
      });
    }
  }
  if (rows.length) await db.from("trips").upsert(rows, { onConflict: "subscription_id,pickup_at", ignoreDuplicates: true });
  return rows.length;
}

