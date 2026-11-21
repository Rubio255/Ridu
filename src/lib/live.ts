import "server-only";
import { supabaseAdmin } from "./supabase/server";

// Gyva vieta rodoma tik kelionės metu: nuo 45 min. iki paėmimo, kol keleivis vežamas.
export const LIVE_BEFORE_MIN = 45;
export function isLive(t: { status: string; pickup_at: string }, now = Date.now()) {
  if (t.status === "picked_up") return true;
  if (t.status !== "scheduled") return false;
  const p = new Date(t.pickup_at).getTime();
  return now >= p - LIVE_BEFORE_MIN * 6e4 && now <= p + 90 * 6e4;
}

export type LivePayload = {
  live: boolean; status: string;
  car: { lat: number; lng: number; at: string; accuracy: number | null } | null;
  from: { lat: number; lng: number } | null; to: { lat: number; lng: number } | null;
};

// Vairuotojo vieta ir maršruto taškai (paėmimas, tikslas) vienai kelionei
export async function livePayload(t: { id: string; status: string; pickup_at: string; subscription_id: string | null }): Promise<LivePayload> {
  const db = supabaseAdmin(), live = isLive(t);
  const [{ data: loc }, { data: sub }] = await Promise.all([
    live ? db.from("trip_locations").select("lat, lng, accuracy, updated_at").eq("trip_id", t.id).maybeSingle() : Promise.resolve({ data: null }),
    t.subscription_id ? db.from("subscriptions").select("from:places!subscriptions_from_place_id_fkey(lat,lng), to:places!subscriptions_to_place_id_fkey(lat,lng)").eq("id", t.subscription_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const pt = (p: unknown) => { const x = p as { lat: number | null; lng: number | null } | null; return x && x.lat != null && x.lng != null ? { lat: x.lat, lng: x.lng } : null; };
  const s = sub as unknown as { from: unknown; to: unknown } | null;
  return {
    live, status: t.status,
    car: loc ? { lat: loc.lat, lng: loc.lng, at: loc.updated_at, accuracy: loc.accuracy } : null,
    from: pt(s?.from), to: pt(s?.to),
  };
}
