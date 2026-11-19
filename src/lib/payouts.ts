import "server-only";
import { supabaseAdmin } from "./supabase/server";
import type { Settings } from "./settings";
import { payoutPct, type DriverRow } from "./drivers";
import { vilniusToday } from "./time";

// Vairuotojo mėnuo: galiojančių sutarčių mėnesio kaina + įvykdytos vienos dienos kelionės.
// Išmoka vairuotojui = procentas nuo sumos be PVM; likutis lieka MB.
export async function monthByDriver(s: Settings, drivers: DriverRow[]) {
  const month = vilniusToday().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  const db = supabaseAdmin();
  const [{ data: subs }, { data: trips }, { data: credits }] = await Promise.all([
    db.from("subscriptions").select("driver_id, monthly_eur, km, weekdays").eq("status", "active"),
    db.from("trips").select("driver_id, price_eur, status, subscription_id").is("subscription_id", null).eq("status", "delivered").gte("pickup_at", start.toISOString()).lt("pickup_at", end.toISOString()),
    // Atšauktos dėl vairuotojo kelionės mažina sumą (klientui įskaitoma)
    db.from("trips").select("driver_id, credit_eur").gt("credit_eur", 0).gte("pickup_at", start.toISOString()).lt("pickup_at", end.toISOString()),
  ]);
  return drivers.map((d) => {
    const ms = (subs ?? []).filter((x) => x.driver_id === d.profile_id), ts = (trips ?? []).filter((t) => t.driver_id === d.profile_id);
    const credit = (credits ?? []).filter((c) => c.driver_id === d.profile_id).reduce((a, c) => a + Number(c.credit_eur), 0);
    const gross = Math.max(0, ms.reduce((a, x) => a + Number(x.monthly_eur), 0) + ts.reduce((a, t) => a + Number(t.price_eur), 0) - credit);
    const net = gross / (1 + s.vat_pct / 100), pct = payoutPct(s, d), payout = Math.round(net * pct) / 100;
    const km = ms.reduce((a, x) => a + (Number(x.km) + s.empty_km) * Math.round((x.weekdays.length * 52) / 12), 0);
    return { d, subs: ms.length, trips: ts.length, gross, net, pct, payout, mb: net - payout, km, fuel: (km * s.fuel_l_100km / 100) * s.fuel_price };
  });
}
