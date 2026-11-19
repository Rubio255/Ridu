import { loadSettings } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { decideSubscription } from "@/app/actions";
import { Pill } from "@/components/shell";
import { blockMin, morningKids, afternoonTrips, hourOccupancy, type SubLike } from "@/lib/pricing";
import { DAYS, eur } from "@/lib/time";
import { assignable, loadDrivers } from "@/lib/drivers";

export default async function Page() {
  const [s, drivers] = await Promise.all([loadSettings(), loadDrivers()]);
  const okDrivers = drivers.filter(assignable);
  const dname = (id: string | null) => drivers.find((d) => d.profile_id === id)?.profile.full_name ?? "nepriskirta";
  const { data } = await supabaseAdmin().from("subscriptions")
    .select("*, child:children(first_name), payer:profiles(full_name, email, phone), from:places!subscriptions_from_place_id_fkey(label, address), to:places!subscriptions_to_place_id_fkey(label, address)")
    .in("status", ["pending", "active"]).order("created_at");
  const subs = data ?? [];
  const lite: SubLike[] = subs.map((x) => ({ ...x, pickup_time: String(x.pickup_time).slice(0, 5), block_min: blockMin(s, x.drive_min) }));
  const pending = subs.filter((x) => x.status === "pending").sort((a, b) => Number(b.is_bid) - Number(a.is_bid) || b.monthly_eur - a.monthly_eur);
  const active = subs.filter((x) => x.status === "active");
  const hours = [13, 14, 15, 16, 17, 18];
  const pill = (v: number, max: number) => v >= max ? "p-bad" : v > 0 ? "p-warn" : "p-ok";

  const Row = ({ x }: { x: (typeof subs)[number] }) => (
    <div className="grid gap-1 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <b>{x.payer.full_name || x.payer.email} · {x.child.first_name}{x.extra_kids ? ` +${x.extra_kids}` : ""} · {x.weekdays.map((w: number) => DAYS[w - 1]).join(", ")} · {x.period === "am" ? "rytas" : String(x.pickup_time).slice(0, 5)}</b>
        <span className="num font-bold">{eur(x.monthly_eur)}/mėn.</span>
      </div>
      <div className="text-sm muted">{x.from.label} → {x.to.label} · {Number(x.km).toFixed(1)} km, {x.drive_min} min kelio · {eur(x.per_trip_eur)} už kelionę vienam vaikui · {x.months} mėn.{x.is_bid ? " · aukciono pasiūlymas" : ""} · vairuotojas {dname(x.driver_id)}</div>
      {x.owner_note && <div className="rounded-lg bg-[var(--warn-bg)] p-2 text-sm font-semibold text-[var(--warn)]">{x.owner_note}</div>}
      {x.status === "pending" ? (
        <form action={decideSubscription} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="id" value={x.id} />
          {x.period === "am" && <label className="grid gap-1 text-xs font-semibold muted">Paėmimo laikas<input type="time" name="pickup_time" className="input" defaultValue={String(x.pickup_time).slice(0, 5)} min={s.morning_start} max={s.morning_end} /></label>}
          <label className="grid gap-1 text-xs font-semibold muted">Vairuotojas<select name="driver_id" required className="input" defaultValue={okDrivers.some((d) => d.profile_id === x.driver_id) ? x.driver_id : ""}><option value="" disabled>Pasirinkite</option>{okDrivers.map((d) => <option key={d.profile_id} value={d.profile_id}>{d.profile.full_name}</option>)}</select></label>
          <button name="decision" value="active" className="btn btn-ok">Patvirtinti</button>
          <button name="decision" value="rejected" className="btn btn-bad">Atmesti</button>
        </form>
      ) : (
        <form action={decideSubscription} className="flex items-center gap-2"><input type="hidden" name="id" value={x.id} /><Pill s={x.status} /><button name="decision" value="ended" className="btn">Nutraukti</button></form>
      )}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Galiojantys", String(active.length)], ["Pajamos / mėn.", eur(active.reduce((a, x) => a + Number(x.monthly_eur), 0))], ["Klientų", String(new Set(active.map((x) => x.payer_id)).size)], ["Pasiūlymai iki", `${s.bid_close_day} d.`]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-sm muted">{l}</div><div className="num text-xl font-bold">{v}</div></div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card content-start"><h2 className="font-bold">Laukia sprendimo</h2><p className="text-sm muted">Aukciono pasiūlymai viršuje, nuo didžiausio.</p>
          {pending.length ? pending.map((x) => <Row key={x.id} x={x} />) : <p className="text-sm muted">Naujų prašymų nėra.</p>}</section>
        <section className="card content-start"><h2 className="font-bold">Užimtumas</h2>
          <div className="overflow-x-auto"><table><thead><tr><th></th>{DAYS.slice(0, 5).map((d) => <th key={d}>{d}</th>)}</tr></thead><tbody>
            <tr><td>Rytas, vaikai</td>{[1, 2, 3, 4, 5].map((w) => { const n = morningKids(lite, w); return <td key={w}><span className={`pill ${pill(n, s.morning_max_kids)}`}>{n}/{s.morning_max_kids}</span></td>; })}</tr>
            <tr><td>Popietė, kel.</td>{[1, 2, 3, 4, 5].map((w) => { const n = afternoonTrips(lite, w); return <td key={w}><span className={`pill ${pill(n, s.afternoon_max_trips)}`}>{n}/{s.afternoon_max_trips}</span></td>; })}</tr>
            {hours.map((h) => <tr key={h}><td>{h}:00</td>{[1, 2, 3, 4, 5].map((w) => { const o = hourOccupancy(lite, w, h); return <td key={w}><span className={`pill ${o > 0.95 ? "p-bad" : o >= 0.5 ? "p-warn" : "p-ok"}`}>{Math.round(o * 100)}%</span></td>; })}</tr>)}
          </tbody></table></div>
          <p className="text-sm muted">Valandų procentai rodo užimtą automobilio laiką. Virš 95 % naujiems klientams siūlomas tik aukcionas.</p></section>
      </div>
      <section className="card"><h2 className="font-bold">Galiojantys</h2>{active.length ? active.map((x) => <Row key={x.id} x={x} />) : <p className="text-sm muted">Dar nėra.</p>}</section>
    </>
  );
}
