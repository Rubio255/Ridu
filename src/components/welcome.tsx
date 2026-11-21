import Link from "next/link";
import { Logo } from "./logo";
import { SavingsCalc } from "./savings-calc";
import { VisitForm } from "./visit-form";
import { SAFETY } from "@/lib/welcome";
import { addDays, vilniusToday } from "@/lib/time";

// Pirmas ekranas: be konkretaus vairuotojo. Šeimos nuotrauka (pasirinko MB), kvietimas susipažinti ir „Ar man apsimoka?“
export function Welcome({ guest, greeting, moreHref }: { guest: boolean; greeting?: string; moreHref?: string }) {
  return (
    <>
      <section className="relative -mx-4 first:-mt-5 grid overflow-hidden bg-[#0d2a26] text-white md:mx-0 md:first:mt-0 md:rounded-[18px]">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- paprastas paveikslėlis veikia ir iOS programėlėje be optimizatoriaus */}
          <img src="/promo.jpg" alt="Mama su dukra prie automobilio prieš kelionę" width={900} height={786} fetchPriority="high" className="h-auto w-full" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent via-45% to-[#0d2a26]" />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-4 text-lg font-bold"><Logo size={34} />Ridu</div>
        <div className="relative -mt-24 grid gap-4 px-4 pb-6">
          {greeting && <p className="font-semibold opacity-90">{greeting}</p>}
          <h1 className="text-balance text-3xl font-bold leading-tight">Saugus ir patogus keleivių vežimas</h1>
          <p className="text-lg opacity-90">Jūsų šeimai. Jūsų kasdienybei. Vilniuje, pastoviu savaitės grafiku.</p>
          <ul className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
            {[["🛡️", "Saugios kelionės", "#saugumas"], ["🗓️", "Lankstus abonementas", "#skaiciuokle"], ["👨‍👩‍👧", "Šeimos sprendimai", "#pokalbis"]].map(([i, t, h]) => (
              <li key={t}><a href={h} className="grid h-full justify-items-center gap-1 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur"><span aria-hidden="true" className="text-2xl">{i}</span>{t}</a></li>
            ))}
          </ul>
          <a href="#pokalbis" className="btn btn-primary btn-lg rounded-full text-lg">Susipažinti su vairuotoju →</a>
          <a href="#skaiciuokle" className="btn btn-lg rounded-full" style={{ background: "rgb(255 255 255 / .12)", borderColor: "rgb(255 255 255 / .3)", color: "#fff" }}>Ar man apsimoka? Kiek laiko sutaupysiu</a>
          {guest && <Link href="/prisijungti" className="justify-self-center font-semibold underline">Prisijungti</Link>}
        </div>
      </section>
      <ul className="grid gap-2 sm:grid-cols-3">
        {[["Patikrinti vairuotojai", "Dokumentus tikriname ir stebime jų galiojimą"], ["Fiksuota mėnesio kaina", "Be registracijos mokesčio"], ["Be ilgų įsipareigojimų", "Sutartį galite nutraukti įspėję prieš 30 d."]].map(([b, t]) => (
          <li key={b} className="card gap-0.5 p-3"><b>{b}</b><span className="text-sm muted">{t}</span></li>
        ))}
      </ul>
      <section id="saugumas" className="card scroll-mt-20">
        <h2 className="text-xl font-bold">Jūsų saugumas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {SAFETY.map(([t, xs]) => (
            <div key={t} className="grid content-start gap-2"><h3 className="font-bold">{t}</h3>
              <ul className="grid gap-1 text-sm">{xs.map((x) => <li key={x}><span className="font-bold text-[var(--ok)]">✓</span> {x}</li>)}</ul></div>
          ))}
        </div>
      </section>
      <SavingsCalc moreHref={moreHref} />
      <VisitForm guest={guest} drivers={[]} minDate={addDays(vilniusToday(), 1)} />
    </>
  );
}
