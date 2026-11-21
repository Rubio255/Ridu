"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quoteAction, createSubscription } from "@/app/actions";
import { Stepper } from "@/components/stepper";

const DAYS = ["Pr", "An", "Tr", "Kt", "Pn"];
const eur = (n: number) => n.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
type Q = Awaited<ReturnType<typeof quoteAction>>;

export function SubForm({ kids, places, hours, planName }: {
  kids: { id: string; first_name: string }[]; places: { id: string; label: string; address: string }[];
  hours: { am: string; deliverBy: string; pmStart: string; pmEnd: string; bidDay: number }; planName?: string | null;
}) {
  const router = useRouter();
  const [f, setF] = useState({ child_id: kids[0]?.id ?? "", from_place_id: places[0]?.id ?? "", to_place_id: places[1]?.id ?? "", weekdays: [2, 4], period: "pm" as "am" | "pm", pickup_time: "14:00", extra_kids: 0, months: 1 });
  const [q, setQ] = useState<Q | null>(null);
  const [bid, setBid] = useState(0);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!f.child_id || !f.from_place_id || !f.to_place_id) return;
    const t = setTimeout(() => start(async () => { const r = await quoteAction(f); setQ(r); if (r.ok) setBid(r.monthly); }), 250);
    return () => clearTimeout(t);
  }, [f]);

  if (!kids.length) return <div className="card muted">Dar nėra keleivių. Pridėkite save ar kitą suaugusįjį skiltyje <a className="underline" href="/tevai/vaikai">„Šeimos nariai ir adresai“</a>. Vaikus įrašo MB pagal sutartį.</div>;
  if (places.length < 2) return <div className="card">Pirmiausia pridėkite bent du adresus skiltyje <a className="underline" href="/tevai/vaikai">„Šeimos nariai ir adresai“</a> (pvz. namus ir mokyklą ar darbą).</div>;

  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const from = places.find((p) => p.id === f.from_place_id), to = places.find((p) => p.id === f.to_place_id);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const r = await createSubscription(f, q?.ok && q.full ? bid : undefined);
    if (!r.ok) { setMsg(r.error ?? "Nepavyko."); return; }
    router.push("/tevai"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {/* Žemėlapis per visą plotį kaip makete (Google Maps įterpimas be API rakto) */}
      <div className="relative -mx-4 -mt-5 h-72 overflow-hidden bg-[var(--surface-2)]">
        {from && to && from.id !== to.id
          ? <iframe title={`Maršrutas: ${from.label} → ${to.label}`} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?saddr=${encodeURIComponent(from.address)}&daddr=${encodeURIComponent(to.address)}&output=embed`} className="h-full w-full border-0" />
          : <iframe title="Žemėlapis" loading="lazy" src="https://maps.google.com/maps?q=Lietuva&z=7&output=embed" className="h-full w-full border-0" />}
        <a href="/tevai" aria-label="Atgal" className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-[var(--surface)] text-lg shadow">←</a>
      </div>
      <div className="card -mt-10 gap-3">
        <h1 className="sr-only">Nauja kelionė</h1>
        <div className="grid gap-0 rounded-2xl border border-[var(--line)] p-1">
          <label className="flex items-center gap-3 px-3 py-2"><span aria-hidden="true" className="h-3 w-3 flex-none rounded-full bg-[#2f6fed]" /><span className="sr-only">Iš kur paimti</span>
            <select className="w-full bg-transparent font-semibold outline-none" value={f.from_place_id} onChange={(e) => set({ from_place_id: e.target.value })}>{places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
          <div className="mx-3 border-t border-[var(--line)]" />
          <label className="flex items-center gap-3 px-3 py-2"><span aria-hidden="true" className="h-3 w-3 flex-none rounded-full bg-[var(--accent)]" /><span className="sr-only">Kur nuvežti</span>
            <select className="w-full bg-transparent font-semibold outline-none" value={f.to_place_id} onChange={(e) => set({ to_place_id: e.target.value })}>{places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        </div>
        {planName && <div className="flex items-center gap-3 rounded-2xl bg-[var(--soft-blue)] p-3"><span aria-hidden="true" className="text-2xl">🚗</span><span className="grid flex-1"><b>{planName}</b><span className="text-xs muted">Kelionės apmokamos iš plano kredito</span></span><span className="text-xs font-semibold muted">įskaičiuota</span></div>}
        <p className="text-sm muted">Pastovus savaitės grafikas už fiksuotą mėnesio kainą.</p>
        <label className="grid gap-1 text-sm font-semibold muted">Keleivis
          <select className="input" value={f.child_id} onChange={(e) => set({ child_id: e.target.value })}>{kids.map((k) => <option key={k.id} value={k.id}>{k.first_name}</option>)}</select></label>
        <div className="grid gap-1 text-sm font-semibold muted"><span>Kiek keleivių važiuos kartu</span>
          <Stepper label="Keleivių skaičius" value={f.extra_kids + 1} min={1} max={4} onChange={(n) => set({ extra_kids: n - 1 })} unit={(n) => n === 1 ? "1 keleivis" : `${n} keleiviai`} /></div>
        <fieldset className="grid gap-1"><legend className="text-sm font-semibold muted">Savaitės dienos</legend>
          <div className="flex flex-wrap gap-2">{DAYS.map((d, i) => {
            const on = f.weekdays.includes(i + 1);
            return <button type="button" key={d} aria-pressed={on} onClick={() => set({ weekdays: on ? f.weekdays.filter((w) => w !== i + 1) : [...f.weekdays, i + 1].sort() })}
              className={`h-10 w-12 rounded-full border text-sm font-semibold ${on ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--line)] bg-[var(--bg)]"}`}>{d}</button>;
          })}</div></fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold muted">Kada
            <select className="input" value={f.period} onChange={(e) => set({ period: e.target.value as "am" | "pm" })}>
              <option value="pm">Po pietų ({hours.pmStart}–{hours.pmEnd})</option>
              <option value="am">Rytinis maršrutas (nuvežama iki {hours.deliverBy})</option></select></label>
          {f.period === "pm" && <label className="grid gap-1 text-sm font-semibold muted">Paėmimo laikas
            <input type="time" className="input" min={hours.pmStart} max={hours.pmEnd} value={f.pickup_time} onChange={(e) => set({ pickup_time: e.target.value })} /></label>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold muted">Įsipareigojimas
            <select className="input" value={f.months} onChange={(e) => set({ months: Number(e.target.value) })}><option value={1}>1 mėnuo</option><option value={3}>3 mėnesiai</option><option value={9}>9 mėnesiai</option></select></label>
        </div>
      </div>

      <div className="card content-start" aria-live="polite">
        <h2 className="font-bold">Kaina</h2>
        {pending && !q && <p className="muted">Skaičiuojama…</p>}
        {q && !q.ok && <p className="rounded-lg bg-[var(--warn-bg)] p-3 text-sm font-semibold text-[var(--warn)]">{q.error}</p>}
        {q && q.ok && (
          <>
            <div className="grid gap-2 rounded-lg bg-[var(--surface-2)] p-3 num">
              <div className="flex justify-between text-sm"><span>{f.weekdays.length} k./sav., apie {q.tripsPerMonth} kelionės per mėn.</span><span>{eur(q.perTrip)} / kel.</span></div>
              <div className="flex justify-between text-sm"><span>Kelionės per mėnesį{q.kids > 1 ? ` (${q.kids} keleiviai)` : ""}</span><span>{eur(q.monthly)}</span></div>
              <div className="flex justify-between text-sm"><span>Platformos mokestis šeimai{q.platformFee ? "" : " (jau mokate)"}</span><span>{q.platformFee ? eur(q.platformFee) : "–"}</span></div>
              <div className="flex justify-between border-t border-[var(--line)] pt-2 font-bold"><span>Iš viso per mėnesį</span><span className="text-xl">{eur(q.monthly + q.platformFee)}</span></div>
            </div>
            <p className="text-sm muted">Platformos mokestis apima aplikaciją, planavimą, pranešimus, vairuotojų patikrą ir aptarnavimą. Pirmą ir paskutinį mėnesį jis skaičiuojamas pagal dienas.</p>
            {f.period === "am" && <p className="text-sm muted">Rytinis maršrutas bendras keliems keleiviams. Tikslų paėmimo laiką nurodys vairuotojas.</p>}
            {q.full ? (
              <>
                <p className="rounded-lg bg-[var(--warn-bg)] p-3 text-sm font-semibold text-[var(--warn)]">{f.period === "am" ? "Rytinis maršrutas šiomis dienomis pilnas." : "Šis laikas užimtas."} Galite pateikti pasiūlymą kitam mėnesiui iki {hours.bidDay} d., ir vairuotojas su jumis susisieks.</p>
                <label className="grid gap-1 text-sm font-semibold muted">Jūsų mėnesio kaina, € (ne mažiau {eur(q.monthly)})
                  <input type="number" className="input" min={q.monthly} step={1} value={bid} onChange={(e) => setBid(Number(e.target.value))} /></label>
                <button className="btn btn-primary btn-lg rounded-full" disabled={pending}>Pateikti pasiūlymą</button>
              </>
            ) : <button className="btn btn-primary btn-lg rounded-full" disabled={pending}>Patvirtinti kelionę · {eur(q.monthly + q.platformFee)} / mėn.</button>}
            <p className="text-sm muted">Kaina nesikeičia visą įsipareigojimo laikotarpį. Užsakymas įsigalioja, kai jį patvirtina vairuotojas.</p>
          </>
        )}
        {msg && <p className="text-sm text-[var(--bad)]">{msg}</p>}
      </div>
    </form>
  );
}
