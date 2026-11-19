import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { blockMin, quoteSubscription, type SubLike } from "./pricing";
import type { Settings } from "./settings";
import { vilniusToday } from "./time";

export type DriverRow = { profile_id: string; cert_no: string; car: string | null; seats: string | null; workdays: number[]; payout_pct: number | null; active: boolean;
  profile: { full_name: string; email: string | null; phone: string | null }; docs: { id: string; name: string; number: string | null; valid_until: string | null }[] };

export async function loadDrivers(): Promise<DriverRow[]> {
  const { data } = await supabaseAdmin().from("drivers").select("*, profile:profiles(full_name, email, phone), docs:driver_documents(id, name, number, valid_until)").order("created_at");
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
