import { Ico } from "@/components/ico";
import Link from "next/link";
import { Logo } from "./logo";

// Pradžios ekranas: ženklas, šūkis, nuotrauka. Naujas klientas pirmiausia renkasi abonementą, tik tada registruojasi
export function Start() {
  return (
    // Fiksuotas per visą ekraną (ir po iPhone būsenos juosta): nuotrauka fone, viršuje ženklas ir šūkis, apačioje mygtukai
    <section className="fixed inset-0 z-[60] overflow-hidden bg-[#1b2a3a] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element -- paprastas paveikslėlis veikia ir iOS programėlėje be optimizatoriaus */}
      <img src="/promo.jpg" alt="Mama su dukra prie automobilio prieš kelionę" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover object-[50%_40%]" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-[#f3f5f9] via-[#f3f5f9]/85 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/80 via-black/45 to-transparent" />
      <div className="relative mx-auto grid h-full max-w-xl grid-rows-[auto_1fr_auto] px-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
        <div className="grid justify-items-center gap-1.5 text-center text-[var(--fg)]">
          <Logo size={56} />
          <b className="text-4xl font-bold tracking-tight text-[#14254f]">Ridu</b>
          <p className="text-xl font-bold leading-snug text-[#14211f]">Saugus ir patogus<br />keleivių vežimas</p>
          <p className="font-medium text-[#3d4b48]">Jūsų šeimai. Jūsų kasdienybei.</p>
        </div>
        <div />
        <div className="grid gap-3">
          <Link href="/planas" className="btn btn-primary btn-lg text-lg" style={{ borderRadius: 999 }}>Pasirinkti abonementą</Link>
          <Link href="/skaiciuokle" className="btn btn-lg rounded-full" style={{ borderRadius: 999, background: "rgb(255 255 255 / .14)", borderColor: "rgb(255 255 255 / .35)", color: "#fff" }}>Ar man apsimoka?</Link>
          <Link href="/prisijungti" className="justify-self-center py-1 font-semibold text-white underline">Jau turiu paskyrą</Link>
        </div>
      </div>
    </section>
  );
}

// Pirmas ekranas: be konkretaus vairuotojo. Šeimos nuotrauka (pasirinko MB), kvietimas susipažinti ir „Ar man apsimoka?“
export function Welcome({ guest, greeting }: { guest: boolean; greeting?: string }) {
  // Kiekviena nuoroda veda į savo atskirą puslapį (neprisijungusiems – vieši, prisijungusiems – programėlės)
  const L = guest
    ? { safety: "/saugumas", sub: "/abonementas", family: "/seimoms", meet: "/susipazinti", calc: "/skaiciuokle" }
    : { safety: "/tevai/saugumas", sub: "/tevai/abonementas", family: "/tevai/vaikai", meet: "/tevai/susipazinti", calc: "/tevai/skaiciuokle" };
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
          <p className="text-lg opacity-90">Jūsų šeimai. Jūsų kasdienybei. Pastoviu savaitės grafiku.</p>
          <ul className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
            {[["shield", "Saugios kelionės", L.safety], ["calendar", "Lankstus abonementas", L.sub], ["family", "Šeimos sprendimai", L.family]].map(([i, t, h]) => (
              <li key={t}><Link href={h} className="grid h-full justify-items-center gap-1 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur"><Ico n={i} size={26} />{t}</Link></li>
            ))}
          </ul>
          <Link href={L.meet} className="btn btn-primary btn-lg rounded-full text-lg">Susipažinti su vairuotoju →</Link>
          <Link href={L.calc} className="btn btn-lg rounded-full" style={{ background: "rgb(255 255 255 / .12)", borderColor: "rgb(255 255 255 / .3)", color: "#fff" }}>Ar man apsimoka? Kiek laiko sutaupysiu</Link>
          {guest && <Link href="/prisijungti" className="justify-self-center font-semibold underline">Jau turiu paskyrą</Link>}
        </div>
      </section>
      <ul className="grid gap-2 sm:grid-cols-3">
        {[["Patikrinti vairuotojai", "Dokumentus tikriname ir stebime jų galiojimą"], ["Fiksuota mėnesio kaina", "Be registracijos mokesčio"], ["Be ilgų įsipareigojimų", "Sutartį galite nutraukti įspėję prieš 30 d."]].map(([b, t]) => (
          <li key={b} className="card gap-0.5 p-3"><b>{b}</b><span className="text-sm muted">{t}</span></li>
        ))}
      </ul>
    </>
  );
}
