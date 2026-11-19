import { requireDriver, loadSettings } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Calendar } from "@/components/calendar";
import { expireOffers } from "@/lib/offers";
import { payoutPct, loadDrivers } from "@/lib/drivers";
import { respondOffer } from "@/app/actions";
import { eur, fmtDay, fmtTime } from "@/lib/time";

export default async function Page() {
  const me = await requireDriver();
  await expireOffers();
  const [s, drivers, { data: offers }] = await Promise.all([loadSettings(), loadDrivers(),
    supabaseAdmin().from("trip_offers").select("id, expires_at, trip:trips(pickup_at, from_label, to_label, block_min, price_eur, child:children(first_name))").eq("driver_id", me.id).eq("status", "pending").order("expires_at")]);
  const pct = payoutPct(s, drivers.find((d) => d.profile_id === me.id) ?? { payout_pct: null });
  return (
    <>
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
      <Calendar driverId={me.id} />
    </>
  );
}
