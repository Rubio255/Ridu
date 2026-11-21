"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { quoteAction, createSubscription } from "@/app/actions";
import { mapsLink } from "@/lib/maps";

const DAYS = ["Pr", "An", "Tr", "Kt", "Pn"];
const eur = (n: number) => n.toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
type Q = Awaited<ReturnType<typeof quoteAction>>;

export function SubForm({ kids, places, hours }: {
  kids: { id: string; first_name: string }[]; places: { id: string; label: string; address: string }[];
  hours: { am: string; deliverBy: string; pmStart: string; pmEnd: string; bidDay: number };
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

  if (!kids.length) return <div className="card muted">Dar nėra keleivių. Pridėkite save ar kitą suaugusįjį skiltyje „Keleiviai ir adresai“. Vaikus įrašo MB pagal sutartį.</div>;
  if (places.length < 2) return <div className="card">Pirmiausia pridėkite bent du adresus skiltyje „Keleiviai ir adresai“ (pvz. namus ir mokyklą ar darbą).</div>;

  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const from = places.find((p) => p.id === f.from_place_id), to = places.find((p) => p.id === f.to_place_id);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg("");
    const r = await createSubscription(f, q?.ok && q.full ? bid : undefined);
    if (!r.ok) { setMsg(r.error ?? "Nepavyko."); return; }
    router.push("/tevai"); router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
      <div className="card">
        <h1 className="text-xl font-bold">Abonementas</h1>
        <p className="text-sm muted">Pastovus savaitės grafikas už fiksuotą mėnesio kainą.</p>
        <label className="grid gap-1 text-sm font-semibold muted">Keleivis
          <select className="input" value={f.child_id} onChange={(e) => set({ child_id: e.target.value })}>{kids.map((k) => <option key={k.id} value={k.id}>{k.first_name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold muted">Kiek keleivių važiuos kartu
          <select className="input text-base" value={f.extra_kids} onChange={(e) => set({ extra_kids: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n - 1}>{n === 1 ? "1 keleivis" : `${n} keleiviai`}</option>)}</select></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold muted">Iš kur paimti
            <select className="input" value={f.from_place_id} onChange={(e) => set({ from_place_id: e.target.value })}>{places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold muted">Kur nuvežti
            <select className="input" value={f.to_place_id} onChange={(e) => set({ to_place_id: e.target.value })}>{places.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
        </div>
        <fieldset className="grid gap-1"><legend className="text-sm font-semibold muted">Savaitės dienos</legend>
          <div className="flex flex-wrap gap-2">{DAYS.map((d, i) => {
            const on = f.weekdays.includes(i + 1);
            return <button type="button" key={d} aria-pressed={on} onClick={() => set({ weekdays: on ? f.weekdays.filter((w) => w !== i + 1) : [...f.weekdays, i + 1].sort() })}
              className={`h-9 w-11 rounded-lg border text-sm font-semibold ${on ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-fg)]" : "border-[var(--line)] bg-[var(--bg)]"}`}>{d}</button>;
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
            {from && to && <a className="text-sm underline" href={mapsLink(from.address, to.address)} target="_blank" rel="noopener">Žiūrėti maršrutą Google Maps</a>}
            {q.full ? (
              <>
                <p className="rounded-lg bg-[var(--warn-bg)] p-3 text-sm font-semibold text-[var(--warn)]">{f.period === "am" ? "Rytinis maršrutas šiomis dienomis pilnas." : "Šis laikas užimtas."} Galite pateikti pasiūlymą kitam mėnesiui iki {hours.bidDay} d., ir vairuotojas su jumis susisieks.</p>
                <label className="grid gap-1 text-sm font-semibold muted">Jūsų mėnesio kaina, € (ne mažiau {eur(q.monthly)})
                  <input type="number" className="input" min={q.monthly} step={1} value={bid} onChange={(e) => setBid(Number(e.target.value))} /></label>
                <button className="btn btn-primary" disabled={pending}>Pateikti pasiūlymą</button>
              </>
            ) : <button className="btn btn-primary" disabled={pending}>Užsakyti už {eur(q.monthly + q.platformFee)} / mėn.</button>}
            <p className="text-sm muted">Kaina nesikeičia visą įsipareigojimo laikotarpį. Užsakymas įsigalioja, kai jį patvirtina vairuotojas.</p>
          </>
        )}
        {msg && <p className="text-sm text-[var(--bad)]">{msg}</p>}
      </div>
    </form>
  );
}
