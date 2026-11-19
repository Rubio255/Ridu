import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { loadSettings } from "./auth";
import { blockMin } from "./pricing";
import { addDays, vilniusToday, vilniusToDate, weekday } from "./time";

// Sukuria ilgalaikių užsakymų keliones į priekį (tik serveryje, ne veiksmas klientui)
export async function generateTrips(subId?: string, days = 28) {
  const db = supabaseAdmin();
  let q = db.from("subscriptions").select("*, child:children(first_name), from:places!subscriptions_from_place_id_fkey(label,address), to:places!subscriptions_to_place_id_fkey(label,address)").eq("status", "active");
  if (subId) q = q.eq("id", subId);
  const { data: subs } = await q;
  const s = await loadSettings();
  const today = vilniusToday();
  const rows = [];
  for (const sb of subs ?? []) {
    for (let i = 0; i < days; i++) {
      const d = addDays(today, i);
      if (d < sb.starts_on || (sb.ends_on && d > sb.ends_on) || !sb.weekdays.includes(weekday(d))) continue;
      const at = vilniusToDate(d, String(sb.pickup_time).slice(0, 5));
      if (at.getTime() < Date.now()) continue;
      rows.push({
        subscription_id: sb.id, child_id: sb.child_id, payer_id: sb.payer_id,
        from_label: sb.from.label, to_label: sb.to.label, from_address: sb.from.address, to_address: sb.to.address,
        pickup_at: at.toISOString(), block_min: blockMin(s, sb.drive_min), price_eur: Number(sb.per_trip_eur) * (1 + sb.extra_kids),
      });
    }
  }
  if (rows.length) await db.from("trips").upsert(rows, { onConflict: "subscription_id,pickup_at", ignoreDuplicates: true });
  return rows.length;
}

