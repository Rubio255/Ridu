import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { blockMin, quoteSubscription, type SubLike } from "./pricing";
import type { Settings } from "./settings";
import { vilniusToday, weekday } from "./time";

export type DriverRow = { profile_id: string; cert_no: string; car: string | null; seats: string | null; workdays: number[]; payout_pct: number | null; active: boolean;
  profile: { full_name: string; email: string | null; phone: string | null }; docs: { id: string; name: string; number: string | null; valid_until: string | null }[];
  absences: { id: string; reason: "sick" | "repair" | "other"; starts_on: string; ends_on: string; note: string | null }[] };

export async function loadDrivers(): Promise<DriverRow[]> {
  const { data } = await supabaseAdmin().from("drivers").select("*, profile:profiles(full_name, email, phone), docs:driver_documents(id, name, number, valid_until), absences:driver_absences(id, reason, starts_on, ends_on, note)").order("created_at");
  return (data ?? []) as unknown as DriverRow[];
}

export const docState = (until: string | null) => !until ? "ok" : until < vilniusToday() ? "bad" : (new Date(until).getTime() - Date.now()) / 864e5 < 30 ? "warn" : "ok";
export const payoutPct = (s: Settings, d: { payout_pct: number | null }) => d.payout_pct ?? s.driver_pct;
// Užsakymai skiriami tik aktyviems vairuotojams su galiojančiais dokumentais
export const assignable = (d: DriverRow) => d.active && !d.docs.some((x) => docState(x.valid_until) === "bad");

export async function subsByDriver(s: Settings) {
  const { data } = await supabaseAdmin().from("subscriptions").select("id, weekdays, period, pickup_time, extra_kids, drive_min, status, driver_id").in("status", ["active", "pending"]);
  const map = new Map<string, SubLike[]>();
  for (const x of data ?? []) {
    if (!x.driver_id) continue;
    const lite = { ...x, pickup_time: String(x.pickup_time).slice(0, 5), block_min: blockMin(s, x.drive_min) };
    map.set(x.driver_id, [...(map.get(x.driver_id) ?? []), lite]);
  }
  return map;
}

// Parenka laisviausią tinkamą vairuotoją ir jo užimtumu pagrįstą kainą
export async function bestDriverQuote(s: Settings, input: Parameters<typeof quoteSubscription>[2], ignoreId?: string) {
  const [drivers, bySub] = await Promise.all([loadDrivers(), subsByDriver(s)]);
  const cands = drivers.filter((d) => assignable(d) && input.weekdays.every((w) => d.workdays.includes(w)));
  const results = cands.map((d) => {
    const subs = (bySub.get(d.profile_id) ?? []).filter((x) => x.id !== ignoreId);
    const q = quoteSubscription(s, subs, input);
    const day = Math.max(0, ...input.weekdays.map((w) => subs.filter((x) => x.weekdays.includes(w)).reduce((a, x) => a + x.block_min, 0)));
    if (q.ok && day + blockMin(s, input.driveMin) > s.day_limit_h * 60) q.full = true;
    return { driver: d.profile_id, q };
  }).filter((r) => r.q.ok).sort((a, b) => Number(a.q.full) - Number(b.q.full) || a.q.monthly - b.q.monthly);
  return results[0] ?? null;
}

export const ABSENCE_LT = { sick: "Liga", repair: "Automobilio remontas", other: "Kita priežastis" } as const;
const vilniusDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Vilnius" });
export const absenceOn = (d: DriverRow | undefined, iso: string) => d?.absences.find((a) => a.starts_on <= vilniusDay(iso) && vilniusDay(iso) <= a.ends_on);

type TripLite = { id: string; pickup_at: string; block_min: number; driver_id: string | null; status: string };
// Būsimos kelionės, kurių vairuotojas tą dieną nedirba dėl ligos ar remonto
export async function affectedTrips(drivers: DriverRow[]) {
  const ids = drivers.filter((d) => d.absences.some((a) => a.ends_on >= vilniusToday())).map((d) => d.profile_id);
  if (!ids.length) return [];
  const { data } = await supabaseAdmin().from("trips").select("id, pickup_at, block_min, driver_id, status, child_id, from_label, to_label, child:children(first_name)")
    .in("driver_id", ids).eq("status", "scheduled").gt("pickup_at", new Date().toISOString()).order("pickup_at");
  return (data ?? []).filter((t) => absenceOn(drivers.find((d) => d.profile_id === t.driver_id), t.pickup_at));
}

// Pakaitiniai vairuotojai: aktyvūs, dokumentai galioja, tą dieną dirba ir neserga, laikas nesikerta
export async function substitutesFor(s: Settings, drivers: DriverRow[], t: TripLite) {
  const day0 = new Date(t.pickup_at); day0.setUTCHours(0, 0, 0, 0);
  const day1 = new Date(day0.getTime() + 2 * 864e5); day0.setTime(day0.getTime() - 864e5);
  const { data } = await supabaseAdmin().from("trips").select("id, pickup_at, block_min, driver_id, status").eq("status", "scheduled").gte("pickup_at", day0.toISOString()).lt("pickup_at", day1.toISOString());
  const wd = weekday(vilniusDay(t.pickup_at));
  const start = new Date(t.pickup_at).getTime(), end = start + t.block_min * 6e4, gap = s.gap_min * 6e4;
  return drivers.filter((d) => d.profile_id !== t.driver_id && assignable(d) && d.workdays.includes(wd) && !absenceOn(d, t.pickup_at))
    .filter((d) => !(data ?? []).some((o) => o.driver_id === d.profile_id && o.id !== t.id && new Date(o.pickup_at).getTime() < end + gap && start < new Date(o.pickup_at).getTime() + o.block_min * 6e4 + gap))
    .map((d) => ({ d, load: (data ?? []).filter((o) => o.driver_id === d.profile_id && vilniusDay(o.pickup_at) === vilniusDay(t.pickup_at)).reduce((a, o) => a + o.block_min, 0) }))
    .sort((a, b) => a.load - b.load).map((x) => x.d);
}
