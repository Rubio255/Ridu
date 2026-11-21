import "server-only";
import { supabaseAdmin } from "./supabase/server";
import type { Settings } from "./settings";
import { payoutPct, type DriverRow } from "./drivers";
import { countedPart } from "./pricing";
import { vilniusToday } from "./time";

// Vairuotojo mėnuo (v7): kiekvienai kelionei užsakant išsaugota vairuotojo dalis –
// procentas nuo standartinės kelionės vertės be PVM, nesvarbu, kaip mokėjo klientas (planas, viršijimas, vienkartinė).
// Atšaukus vėlai skaičiuojama mokesčio dalis, atšaukus dėl teikėjo – nieko.
export async function monthByDriver(s: Settings, drivers: DriverRow[]) {
  const month = vilniusToday().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00Z`), end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1);
  const db = supabaseAdmin();
  const [{ data: subs }, { data: trips }] = await Promise.all([
    db.from("subscriptions").select("driver_id, km, weekdays").eq("status", "active"),
    db.from("trips").select("driver_id, price_eur, status, cancel_fee_pct, credit_eur, driver_share_eur").gte("pickup_at", start.toISOString()).lt("pickup_at", end.toISOString()),
  ]);
  return drivers.map((d) => {
    const ms = (subs ?? []).filter((x) => x.driver_id === d.profile_id);
    const ts = (trips ?? []).filter((t) => t.driver_id === d.profile_id && countedPart(t) > 0);
    const pct = payoutPct(s, d), vat = 1 + s.vat_pct / 100;
    const gross = ts.reduce((a, t) => a + Number(t.price_eur) * countedPart(t), 0), net = gross / vat;
    const payout = Math.round(ts.reduce((a, t) => a + (t.driver_share_eur != null ? Number(t.driver_share_eur) : Number(t.price_eur) / vat * pct / 100) * countedPart(t), 0) * 100) / 100;
    const km = ms.reduce((a, x) => a + (Number(x.km) + s.empty_km) * Math.round((x.weekdays.length * 52) / 12), 0);
    return { d, subs: ms.length, trips: ts.length, gross, net, pct, payout, mb: net - payout, km, fuel: (km * s.fuel_l_100km / 100) * s.fuel_price };
  });
}
