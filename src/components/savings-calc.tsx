"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { calcAction } from "@/app/actions";
import { Stepper } from "./stepper";

const e0 = (n: number) => Math.round(n).toLocaleString("lt-LT") + " €";
type R = Awaited<ReturnType<typeof calcAction>>;

function Bar({ parts, max }: { parts: [number, string][]; max: number }) {
  return <div aria-hidden="true" className="flex h-3.5 overflow-hidden rounded-full bg-[var(--surface-2)]">{parts.map(([v, c], i) => <i key={i} className="block h-full" style={{ width: `${v / max * 100}%`, background: c }} />)}</div>;
}
const Dot = ({ c }: { c: string }) => <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: c }} />;

// „Ar man apsimoka?“ – skaičiuojama serveryje, klientas mato tik rezultatą. Pagrindinė mintis: jūsų laikas taip pat kainuoja.
export function SavingsCalc({ moreHref }: { moreHref?: string }) {
  const [f, setF] = useState({ km: 8, perWeek: 2, passenger: "child" as "child" | "adult" | "senior", hourValue: 15 });
  const [r, setR] = useState<R | null>(null);
  const [, start] = useTransition();
  useEffect(() => { const t = setTimeout(() => start(async () => setR(await calcAction(f))), 200); return () => clearTimeout(t); }, [f]);
  const max = r ? Math.max(r.sub, r.self, 1) : 1, h = r?.hours.toLocaleString("lt-LT") ?? "";
  const CAR = "#8a9a97", TIME = "var(--accent)", RIDU = "var(--brand)";
  return (
    <section id="skaiciuokle" className="card scroll-mt-20 border-2 border-[var(--brand)]">
      <h2 className="text-xl font-bold">Ar man apsimoka?</h2>
      <p className="text-sm muted">Vežiodami patys mokate ne tik už kurą. Mokate ir savo laiku, o jūsų valanda taip pat kainuoja.</p>
      {/* Etiketė, laukelis ir paaiškinimas sulygiuoti eilutėmis (subgrid), kad laukeliai būtų viename aukštyje */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 md:grid-cols-4">
        {([
          ["Atstumas, km", <Stepper key="km" label="Atstumas, km" min={1} max={40} value={f.km} onChange={(n) => setF({ ...f, km: n })} />, "Į vieną pusę, pvz. nuo mokyklos iki būrelio"],
          ["Kelionių per savaitę", <Stepper key="pw" label="Kelionių per savaitę" min={1} max={14} value={f.perWeek} onChange={(n) => setF({ ...f, perWeek: n })} />, "Ten ir atgal skaičiuokite kaip 2"],
          ["Keleivis", <select key="px" id="calc-px" className="input" value={f.passenger} onChange={(e) => setF({ ...f, passenger: e.target.value as typeof f.passenger })}><option value="child">Vaikas</option><option value="adult">Suaugęs</option><option value="senior">Senjoras su palyda</option></select>, ""],
          ["Valandos vertė, €", <input key="hv" id="calc-hv" className="input" type="number" min={0} max={200} value={f.hourValue} onChange={(e) => setF({ ...f, hourValue: Number(e.target.value) })} />, "Kiek uždirbate per valandą"],
        ] as [string, React.ReactNode, string][]).map(([label, field, hint]) => (
          // Stepper turi savo mygtukus, todėl apgaubiama ne <label>, o <div> (kitaip paspaudus etiketę suveiktų „−“)
          <div key={label} className="row-span-3 grid grid-rows-subgrid gap-1 pb-2 text-sm font-semibold muted">
            <label htmlFor={label === "Keleivis" ? "calc-px" : label.startsWith("Valandos") ? "calc-hv" : undefined} className="self-end">{label}</label>{field}<span className="text-xs font-normal">{hint}</span>
          </div>
        ))}
      </div>
      {r && (
        <div aria-live="polite" className="grid gap-3">
          <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-2)] p-3"><span aria-hidden="true" className="text-3xl">⏰</span>
            <div className="grid"><b className="text-xl">Atgaunate {h} val. per mėnesį</b><span className="text-sm muted">Tiek laiko nereikės vairuoti, laukti ir ieškoti, kur pastatyti automobilį.</span></div></div>
          <div className="grid gap-1.5">
            <div className="flex justify-between"><span>Vežiojate patys</span><b className="num text-xl">{e0(r.self)}</b></div>
            <Bar parts={[[r.car, CAR], [r.time, TIME]]} max={max} />
            <div className="flex flex-wrap gap-x-4 text-sm muted"><span><Dot c={CAR} />kuras, automobilis, parkavimas {e0(r.car)}</span><span><Dot c={TIME} />jūsų laikas: {h} val. × {e0(f.hourValue)} = {e0(r.time)}</span></div>
            <div className="flex justify-between pt-1"><span>Su Ridu</span><b className="num text-xl">{e0(r.sub)}</b></div>
            <Bar parts={[[r.sub, RIDU]]} max={max} />
            <div className="text-sm muted"><Dot c={RIDU} />viskas įskaičiuota, jūsų laiko 0 val.</div>
          </div>
          <p className={`rounded-lg p-3 font-semibold ${r.sub <= r.self ? "bg-[var(--ok-bg)]" : "bg-[var(--warn-bg)]"}`}>
            {r.sub <= r.self ? `Su Ridu sutaupote ${e0(r.self - r.sub)} per mėnesį ir dar ${h} val. laisvo laiko.` : `Su Ridu mokate ${e0(r.sub - r.self)} daugiau, bet ${h} val. per mėnesį lieka jums.`}
          </p>
        </div>
      )}
      {moreHref && <Link href={moreHref} className="text-sm underline">Daugiau apie kainas</Link>}
    </section>
  );
}
