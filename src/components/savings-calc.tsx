"use client";
import { useEffect, useState, useTransition } from "react";
import { calcAction } from "@/app/actions";
import { Stepper } from "./stepper";

const e0 = (n: number) => Math.round(n).toLocaleString("lt-LT") + " €";
type R = Awaited<ReturnType<typeof calcAction>>;

function Slider({ id, label, value, min, max, step, onChange, show }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void; show: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2"><label htmlFor={id} className="text-sm font-semibold muted">{label}</label><b className="num">{show}</b></div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
    </div>
  );
}

// „Ar man apsimoka?“ su tikslinimu: visi parametrai keičiami. Skaičiuojama serveryje, klientas mato tik rezultatą.
export function SavingsCalc({ planHref = "/tevai/planas" }: { planHref?: string }) {
  const [f, setF] = useState({ days: 2, perDay: 1, km: 8, hourValue: 15, costPerKm: 0.3, parking: 1 });
  const [more, setMore] = useState(false);
  const [r, setR] = useState<R | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    const t = setTimeout(() => start(async () => setR(await calcAction({ km: f.km, perWeek: f.days * f.perDay, hourValue: f.hourValue, costPerKm: f.costPerKm, parking: f.parking }))), 200);
    return () => clearTimeout(t);
  }, [f]);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const h = r?.hours.toLocaleString("lt-LT") ?? "";
  const pct = r && r.self > 0 ? Math.round((r.self - r.sub) / r.self * 100) : 0;

  return (
    <div className="grid gap-4">
      <section className="card gap-4" aria-label="Parametrai">
        <div className="grid gap-1"><span className="text-sm font-semibold muted">Dienų per savaitę</span>
          <Stepper label="Dienų per savaitę" value={f.days} min={1} max={5} onChange={(n) => set({ days: n })} /></div>
        <div className="grid gap-1"><span className="text-sm font-semibold muted">Kelionių per dieną</span>
          <Stepper label="Kelionių per dieną" value={f.perDay} min={1} max={4} onChange={(n) => set({ perDay: n })} /></div>
        <Slider id="c-km" label="Atstumas į vieną pusę" value={f.km} min={1} max={40} step={1} onChange={(n) => set({ km: n })} show={`${f.km} km`} />
        <Slider id="c-hv" label="Jūsų valandos vertė" value={f.hourValue} min={0} max={60} step={1} onChange={(n) => set({ hourValue: n })} show={`${f.hourValue} €/val.`} />
        <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="justify-self-start text-sm font-semibold text-[var(--brand)]">{more ? "Mažiau parametrų" : "Tikslinti: automobilis ir parkavimas"}</button>
        {more && (
          <>
            <Slider id="c-km-cost" label="Automobilio kaina už km (kuras, nusidėvėjimas)" value={f.costPerKm} min={0.1} max={0.8} step={0.05} onChange={(n) => set({ costPerKm: n })} show={`${f.costPerKm.toFixed(2)} €/km`} />
            <Slider id="c-park" label="Parkavimas vienai kelionei" value={f.parking} min={0} max={6} step={0.5} onChange={(n) => set({ parking: n })} show={`${f.parking.toLocaleString("lt-LT")} €`} />
          </>
        )}
      </section>

      {r && (
        <section className="card gap-3 bg-[var(--info-bg)]" aria-live="polite" aria-label="Rezultatas">
          <div className="grid"><b>Rezultatas</b><span className="text-sm">Kelionių per mėnesį: {r.tripsPerMonth}</span></div>
          <div className="grid grid-cols-2 divide-x divide-[var(--line)] rounded-2xl bg-[var(--surface)] p-3 num">
            <div className="grid pr-3"><span className="text-sm muted">Vežiojant patiems</span><b className="text-3xl">{e0(r.self)}</b><span className="text-xs muted">automobilis {e0(r.car)} + laikas {e0(r.time)}</span></div>
            <div className="grid pl-3"><span className="text-sm muted">Su Ridu</span><b className="text-3xl">{e0(r.sub)}</b><span className="text-xs muted">3 mėn. abonementas</span></div>
          </div>
          <p className={`flex items-center justify-between gap-2 rounded-full px-4 py-2 text-sm font-bold ${r.sub <= r.self ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--warn-bg)] text-[var(--warn)]"}`}>
            {r.sub <= r.self ? <><span>Sutaupote {e0(r.self - r.sub)} / mėn.</span><span>≈ {pct} %</span></> : <span>Primokate {e0(r.sub - r.self)}, atgaunate {h} val.</span>}
          </p>
          <p className="text-sm">Laiko, kurio nereikės vairuoti ir laukti: <b>{h} val. per mėnesį</b>.</p>
        </section>
      )}
      {r && (
        <section className="card gap-2" aria-label="Tinkamiausias planas">
          <span className="text-sm muted">Tinkamiausias kredito planas</span>
          <b className="text-lg">{r.plan.name}: {e0(r.plan.due)} / mėn.</b>
          <span className="text-sm">{e0(r.plan.credit)} kredito kelionėms{r.plan.due > r.plan.price ? `, viršijus mokama ${e0(r.plan.due - r.plan.price)} daugiau` : ""}. Platformos mokestis įskaičiuotas.</span>
          <a href={planHref} className="btn btn-primary btn-lg">Rinktis planą</a>
          <p className="text-xs muted">Tikslią kainą pamatysite užsakydami. Palyginimui naudojama {f.hourValue} €/val. jūsų laiko vertė.</p>
        </section>
      )}
    </div>
  );
}
