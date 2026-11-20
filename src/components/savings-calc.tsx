"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { calcAction } from "@/app/actions";

const eur = (n: number) => n.toLocaleString("lt-LT", { maximumFractionDigits: 0 }) + " €";
type R = Awaited<ReturnType<typeof calcAction>>;

// „Ar man apsimoka?“ – skaičiuojama serveryje, klientas mato tik rezultatą
export function SavingsCalc({ moreHref }: { moreHref?: string }) {
  const [f, setF] = useState({ km: 8, perWeek: 2, passenger: "child" as "child" | "adult" | "senior", leisure: false });
  const [r, setR] = useState<R | null>(null);
  const [, start] = useTransition();
  useEffect(() => { const t = setTimeout(() => start(async () => setR(await calcAction(f))), 200); return () => clearTimeout(t); }, [f]);
  const diff = r ? r.sub - r.self : 0, mx = r ? Math.max(r.sub, r.self, 1) : 1, h = r?.hours.toLocaleString("lt-LT") ?? "";
  return (
    <section id="skaiciuokle" className="card scroll-mt-4 border-2 border-[var(--brand)]">
      <h2 className="text-xl font-bold">Ar man apsimoka?</h2>
      <p className="text-sm muted">Palyginkite abonementą su tuo, kiek kainuoja vežioti patiems: kuras, automobilio dėvėjimasis, parkavimas ir jūsų laikas.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold muted">Atstumas, km<input className="input" type="number" min={1} max={40} step={0.5} value={f.km} onChange={(e) => setF({ ...f, km: Number(e.target.value) })} /></label>
        <label className="grid gap-1 text-sm font-semibold muted">Kartų per savaitę<input className="input" type="number" min={1} max={14} value={f.perWeek} onChange={(e) => setF({ ...f, perWeek: Number(e.target.value) })} /></label>
        <label className="grid gap-1 text-sm font-semibold muted">Keleivis<select className="input" value={f.passenger} onChange={(e) => setF({ ...f, passenger: e.target.value as typeof f.passenger })}><option value="child">Vaikas</option><option value="adult">Suaugęs</option><option value="senior">Senjoras su palyda</option></select></label>
        <label className="grid gap-1 text-sm font-semibold muted">Patys važiuotumėte<select className="input" value={f.leisure ? "free" : "work"} onChange={(e) => setF({ ...f, leisure: e.target.value === "free" })}><option value="work">Darbo laiku</option><option value="free">Laisvalaikiu</option></select></label>
      </div>
      {r && (
        <div aria-live="polite" className="grid gap-3">
          <p className={`rounded-lg p-3 ${diff <= 0 ? "bg-[var(--ok-bg)]" : "bg-[var(--warn-bg)]"}`}>
            {diff <= 0 ? <><b>Apsimoka.</b> Abonementas pigesnis {eur(-diff)} per mėnesį, ir dar atgaunate {h} val. laiko.</>
              : <><b>Atgaunate {h} val. per mėnesį.</b> Abonementas brangesnis {eur(diff)}, tai {(diff / r.hours).toLocaleString("lt-LT", { maximumFractionDigits: 2 })} € už kiekvieną valandą be vairavimo.</>}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[["Ridu abonementas", r.sub, "per mėn. su platformos mokesčiu · 0 val. jūsų laiko", "var(--brand)"], ["Vežiojant patiems", r.self, `per mėn. · ${h} val. jūsų laiko`, "var(--muted)"]].map(([l, v, sub, c]) => (
              <div key={l as string} className="grid gap-1"><span className="text-sm muted">{l}</span><b className="num text-3xl">{eur(v as number)}</b>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]"><i className="block h-full" style={{ width: `${(v as number) / mx * 100}%`, background: c as string }} /></div>
                <span className="text-sm muted">{sub}</span></div>
            ))}
          </div>
        </div>
      )}
      {moreHref && <Link href={moreHref} className="text-sm underline">Daugiau apie kainas</Link>}
    </section>
  );
}
