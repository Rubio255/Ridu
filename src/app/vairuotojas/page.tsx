import { requireDriver, loadSettings } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Calendar } from "@/components/calendar";
import { expireOffers } from "@/lib/offers";
import { payoutPct, loadDrivers } from "@/lib/drivers";
import { respondOffer } from "@/app/actions";
import { eur, fmtDay, fmtTime, vilniusToday } from "@/lib/time";
import { VISIT_HOW, VISIT_WHO } from "@/lib/welcome";
import { DriverLocation } from "@/components/driver-location";
import { SosButton } from "@/components/sos-button";
import { isLive } from "@/lib/live";

export default async function Page() {
  const me = await requireDriver();
  await expireOffers();
  const [s, drivers, { data: offers }, { data: visits }] = await Promise.all([loadSettings(), loadDrivers(),
    supabaseAdmin().from("trip_offers").select("id, expires_at, trip:trips(pickup_at, from_label, to_label, block_min, price_eur, child:children(first_name))").eq("driver_id", me.id).eq("status", "pending").order("expires_at"),
    supabaseAdmin().from("visit_requests").select("id, name, phone, how, who, org, note, wanted_date, wanted_time").eq("driver_id", me.id).eq("status", "confirmed").gte("wanted_date", vilniusToday()).order("wanted_date")]);
  // Dabartinė kelionė: vežamas keleivis arba paėmimas artimiausiu metu
  const { data: near } = await supabaseAdmin().from("trips").select("id, status, pickup_at, from_label, to_label, child:children(first_name)").eq("driver_id", me.id).in("status", ["scheduled", "picked_up"])
    .gte("pickup_at", new Date(Date.now() - 6 * 36e5).toISOString()).lte("pickup_at", new Date(Date.now() + 2 * 36e5).toISOString()).order("pickup_at");
  const live = (near ?? []).find((t) => t.status === "picked_up") ?? (near ?? []).find((t) => isLive(t));
  const pct = payoutPct(s, drivers.find((d) => d.profile_id === me.id) ?? { payout_pct: null });
  return (
    <>
      {live && (
        <section className="card border-2 border-[var(--accent)]" aria-label="Dabartinė kelionė">
          <h2 className="font-bold">{live.status === "picked_up" ? "Vežate dabar" : "Artimiausia kelionė"}: {fmtTime(live.pickup_at)} · {(live.child as unknown as { first_name: string }).first_name}</h2>
          <p className="text-sm muted">{live.from_label} → {live.to_label}</p>
          <DriverLocation tripId={live.id} />
          <SosButton tripId={live.id} />
        </section>
      )}
      {(offers ?? []).length > 0 && (
        <section className="card">
          <h2 className="font-bold">Pasiūlymai perimti kelionę</h2>
          <p className="text-sm muted">Kolega negali vežti dėl ligos ar automobilio remonto. Priimkite, jei galite.</p>
          {(offers ?? []).map((o) => { const t = o.trip as unknown as { pickup_at: string; from_label: string; to_label: string; block_min: number; price_eur: number; child: { first_name: string } }; return (
            <form key={o.id} action={respondOffer} className="grid gap-1 border-t border-[var(--line)] pt-3"><input type="hidden" name="id" value={o.id} />
              <div className="flex flex-wrap justify-between gap-2"><b>{fmtDay(t.pickup_at)} {fmtTime(t.pickup_at)} · {t.child.first_name}</b><span className="num font-bold">{eur((t.price_eur / (1 + s.vat_pct / 100)) * pct / 100)}</span></div>
              <div className="text-sm muted">{t.from_label} → {t.to_label} · {t.block_min} min · atsakykite iki {fmtTime(o.expires_at)}</div>
              <div className="flex gap-2"><button name="answer" value="yes" className="btn btn-ok">Priimti</button><button name="answer" value="no" className="btn btn-bad">Atsisakyti</button></div>
            </form>); })}
        </section>
      )}
      {(visits ?? []).length > 0 && (
        <section className="card"><h2 className="font-bold">Mano pažintiniai pokalbiai</h2>
          {(visits ?? []).map((v) => <div key={v.id} className="grid gap-1 border-t border-[var(--line)] pt-3 text-sm first:border-0 first:pt-0"><b>{v.wanted_date} {String(v.wanted_time).slice(0, 5)} · {v.name}</b><span className="muted">{VISIT_HOW[v.how as keyof typeof VISIT_HOW]} · {VISIT_WHO[v.who as keyof typeof VISIT_WHO]}{v.phone ? ` · ${v.phone}` : ""}{v.org ? ` · ${v.org}` : ""}</span>{v.note && <span>{v.note}</span>}</div>)}
        </section>
      )}
      <Calendar driverId={me.id} />
    </>
  );
}
