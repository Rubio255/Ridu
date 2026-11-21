"use client";
import { Ico } from "@/components/ico";
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
    <section className="card gap-4" aria-label="Skaičiuoklė">
      <div className="grid gap-1"><span className="font-semibold">Kelionės per savaitę</span>
        <Stepper label="Kelionės per savaitę" value={f.days} min={1} max={5} onChange={(n) => set({ days: n })} /></div>
      <div className="grid gap-1"><span className="font-semibold">Kelionės per dieną</span>
        <Stepper label="Kelionės per dieną" value={f.perDay} min={1} max={4} onChange={(n) => set({ perDay: n })} /></div>
      <Slider id="c-km" label="Atstumas į vieną pusę" value={f.km} min={1} max={40} step={1} onChange={(n) => set({ km: n })} show={`${f.km} km`} />
      <Slider id="c-hv" label="Jūsų valandos vertė" value={f.hourValue} min={0} max={60} step={1} onChange={(n) => set({ hourValue: n })} show={`${f.hourValue} €/val.`} />
      <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="justify-self-start text-sm font-semibold text-[var(--navy)]">{more ? "Mažiau parametrų" : "Tikslinti: automobilis ir parkavimas"}</button>
      {more && (
        <>
          <Slider id="c-km-cost" label="Automobilio kaina už km (kuras, nusidėvėjimas)" value={f.costPerKm} min={0.1} max={0.8} step={0.05} onChange={(n) => set({ costPerKm: n })} show={`${f.costPerKm.toFixed(2)} €/km`} />
          <Slider id="c-park" label="Parkavimas vienai kelionei" value={f.parking} min={0} max={6} step={0.5} onChange={(n) => set({ parking: n })} show={`${f.parking.toLocaleString("lt-LT")} €`} />
        </>
      )}
      {r && (
        <div className="grid gap-3" aria-live="polite">
          <dl className="grid gap-1.5 rounded-2xl bg-[var(--soft-blue)] p-4 num">
            <div className="flex justify-between"><dt>Mėnesio kelionių:</dt><dd className="font-bold">{r.tripsPerMonth}</dd></div>
            <div className="flex justify-between"><dt>Vežiojant patiems:</dt><dd className="text-lg font-bold">{e0(r.self)}</dd></div>
            <div className="flex justify-between"><dt>Abonementas:</dt><dd className="text-lg font-bold">{e0(r.sub)}</dd></div>
            <div className={`flex justify-between font-bold ${r.sub <= r.self ? "text-[var(--ok)]" : "text-[var(--warn)]"}`}><dt>{r.sub <= r.self ? "Sutaupymas:" : "Primokėtumėte:"}</dt><dd className="text-lg">{e0(Math.abs(r.self - r.sub))}</dd></div>
          </dl>
          <p className={`flex items-center gap-3 rounded-2xl p-4 font-bold ${r.sub <= r.self ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--warn-bg)] text-[var(--warn)]"}`}>
            <Ico n={r.sub <= r.self ? "ok" : "clock"} size={30} className="flex-none" />
            {r.sub <= r.self ? `Abonementas apsimoka ${pct}%!` : `Atgaunate ${h} val. laiko per mėnesį`}
          </p>
          <p className="text-xs muted">Vežiojant patiems: automobilis {e0(r.car)} ir jūsų laikas {e0(r.time)} ({h} val.). Abonementas: 3 mėn. su platformos mokesčiu. Arba planas „{r.plan.name}“ už {e0(r.plan.due)} / mėn. su {e0(r.plan.credit)} kredito.</p>
          <a href={planHref} className="btn btn-primary btn-lg rounded-full">Pasirinkti planą</a>
        </div>
      )}
    </section>
  );
}
