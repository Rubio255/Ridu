import { loadSettings } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { ABSENCE_LT, absenceOn, affectedTrips, loadDrivers, substitutesFor } from "@/lib/drivers";
import { expireOffers, OFFER_HOURS } from "@/lib/offers";
import { cancelForProvider, deleteAbsence, offerAllAffected, offerTrip, reportAbsence } from "@/app/actions";
import { fmtDay, fmtTime, vilniusToday } from "@/lib/time";

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("lt-LT", { month: "long", day: "numeric" });

export default async function Page() {
  await expireOffers();
  const [s, drivers] = await Promise.all([loadSettings(), loadDrivers()]);
  const trips = await affectedTrips(drivers);
  const { data: offers } = trips.length ? await supabaseAdmin().from("trip_offers").select("trip_id, driver_id, status, expires_at").in("trip_id", trips.map((t) => t.id)).order("created_at") : { data: [] };
  const name = (id: string | null) => drivers.find((d) => d.profile_id === id)?.profile.full_name ?? "–";
  const absences = drivers.flatMap((d) => d.absences.filter((a) => a.ends_on >= vilniusToday()).map((a) => ({ d, a })));
  const rows = await Promise.all(trips.map(async (t) => {
    const os = (offers ?? []).filter((o) => o.trip_id === t.id), pending = os.find((o) => o.status === "pending");
    const tried = new Set(os.map((o) => o.driver_id));
    return { t, pending, tried: os.filter((o) => o.status !== "pending"), subs: pending ? [] : (await substitutesFor(s, drivers, t)).filter((d) => !tried.has(d.profile_id)) };
  }));
  return (
    <>
      <h1 className="text-xl font-bold">Liga ir remontas</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card content-start">
          <h2 className="font-bold">Nedirbantys vairuotojai</h2>
          {absences.length === 0 && <p className="text-sm muted">Šiuo metu visi vairuotojai dirba.</p>}
          {absences.map(({ d, a }) => (
            <form key={a.id} action={deleteAbsence} className="flex flex-wrap items-center justify-between gap-2 text-sm"><input type="hidden" name="id" value={a.id} />
              <span><b>{d.profile.full_name}</b>: {ABSENCE_LT[a.reason]} {fmt(a.starts_on)} – {fmt(a.ends_on)}{a.note ? ` · ${a.note}` : ""}</span><button className="btn">Panaikinti</button></form>
          ))}
        </section>
        <form action={reportAbsence} className="card content-start">
          <h2 className="font-bold">Įrašyti vairuotojo vardu</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold muted">Vairuotojas<select name="driver_id" required className="input">{drivers.map((d) => <option key={d.profile_id} value={d.profile_id}>{d.profile.full_name}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-semibold muted">Priežastis<select name="reason" className="input"><option value="sick">Liga</option><option value="repair">Automobilio remontas</option><option value="other">Kita priežastis</option></select></label>
            <label className="grid gap-1 text-sm font-semibold muted">Nuo<input type="date" name="starts_on" required defaultValue={vilniusToday()} className="input" /></label>
            <label className="grid gap-1 text-sm font-semibold muted">Iki<input type="date" name="ends_on" required defaultValue={vilniusToday()} className="input" /></label>
          </div>
          <button className="btn btn-primary">Įrašyti</button>
        </form>
      </div>
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Kelionės be vairuotojo</h2>
          {rows.some((r) => !r.pending && r.subs.length) && <form action={offerAllAffected}><button className="btn btn-primary">Siųsti pasiūlymus visoms</button></form>}</div>
        {rows.length === 0 && <p className="text-sm muted">Paveiktų kelionių nėra.</p>}
        {rows.map(({ t, pending, tried, subs }) => {
          const a = absenceOn(drivers.find((d) => d.profile_id === t.driver_id), t.pickup_at);
          return (
            <div key={t.id} className="grid gap-1 border-t border-[var(--line)] pt-3">
              <div className="flex flex-wrap justify-between gap-2"><b>{fmtDay(t.pickup_at)} {fmtTime(t.pickup_at)} · {(t.child as unknown as { first_name: string }).first_name}</b><span className="text-sm muted">{name(t.driver_id)}{a ? ` · ${ABSENCE_LT[a.reason].toLowerCase()}` : ""}</span></div>
              <div className="text-sm muted">{t.from_label} → {t.to_label}</div>
              {pending && <div className="text-sm"><span className="pill p-warn">Pasiūlyta</span> laukia atsakymo: {name(pending.driver_id)} iki {fmtTime(pending.expires_at)}</div>}
              {tried.length > 0 && <div className="text-sm muted">Atsisakė ar neatsakė: {tried.map((o) => name(o.driver_id)).join(", ")}</div>}
              <div className="flex flex-wrap items-end gap-2">
                {!pending && (subs.length ? (
                  <form action={offerTrip} className="flex flex-wrap items-end gap-2"><input type="hidden" name="trip_id" value={t.id} />
                    <label className="grid gap-1 text-xs font-semibold muted">Siūlyti laisvam vairuotojui<select name="driver_id" className="input">{subs.map((d) => <option key={d.profile_id} value={d.profile_id}>{d.profile.full_name}</option>)}</select></label>
                    <button className="btn btn-ok">Siųsti pasiūlymą</button></form>
                ) : <span className="text-sm">Laisvo vairuotojo tuo metu nėra.</span>)}
                <form action={cancelForProvider}><input type="hidden" name="id" value={t.id} /><button className="btn btn-bad">Atšaukti be mokesčio</button></form>
              </div>
            </div>
          );
        })}
        <p className="text-sm muted">Siūloma tik vairuotojams, kurie tuo metu laisvi, tą dieną dirba ir neviršys {s.day_limit_h} val. darbo dienos. Vairuotojas pasiūlymą priima arba atsisako; neatsakius per {OFFER_HOURS} val., pasiūloma kitam. Jei pakaitos nėra, kelionė atšaukiama be mokesčio, o kaina įskaitoma į kliento sąskaitą.</p>
      </section>
    </>
  );
}
