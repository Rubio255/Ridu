import { Ico } from "@/components/ico";
import Link from "next/link";
import { Logo } from "./logo";
import { SAFETY } from "@/lib/welcome";

// Viešų puslapių rėmelis neprisijungusiems: logotipas, grįžimas į pradžią ir prisijungimas
export function PublicPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="sticky-safe sticky z-10 bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-2.5">
          <span className="flex items-center gap-2 font-bold"><Logo size={30} />Ridu</span>
          <Link href="/prisijungti" className="rounded-full border border-current px-3 py-1 text-sm">Prisijungti</Link>
        </div>
      </header>
      <main className="mx-auto grid max-w-xl gap-4 px-4 py-5 pb-12">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/" aria-label="Atgal į pradžią" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-lg text-[var(--navy)]"><Ico n="back" /></Link>
          <h1 className="text-center text-lg font-bold">{title}</h1>
        </div>
        {children}
      </main>
    </>
  );
}

export function SafetyInfo() {
  return (
    <>
      <section className="card justify-items-center gap-2 py-6 text-center">
        <span aria-hidden="true" className="grid h-16 w-16 place-items-center rounded-full bg-[var(--ok-bg)] text-[var(--ok)]"><Ico n="shield" size={32} /></span>
        <h2 className="text-xl font-bold">Saugumas pirmoje vietoje</h2>
        <p className="muted">Patikimas ir patikrintas vairuotojas, tvarkingas automobilis ir pranešimai jums visos kelionės metu.</p>
      </section>
      {SAFETY.map(([t, xs]) => (
        <section key={t} className="card">
          <h2 className="font-bold">{t}</h2>
          <ul className="grid gap-2">{xs.map((x) => <li key={x} className="grid grid-cols-[20px_1fr] gap-2"><Ico n="check" size={18} stroke={2.6} className="mt-0.5 text-[var(--ok)]" /><span>{x}</span></li>)}</ul>
        </section>
      ))}
    </>
  );
}

const STEPS: [string, string][] = [
  ["Pasirenkate dienas ir laiką", "Pvz. antradienį ir ketvirtadienį 14:00 iš mokyklos į būrelį."],
  ["Iš karto matote mėnesio kainą", "Kaina fiksuota visam įsipareigojimo laikotarpiui: 1, 3 arba 9 mėn."],
  ["Vairuotojas patvirtina", "Abonementas įsigalioja, kai vairuotojas patvirtina laiką."],
  ["Keliaujate pagal grafiką", "Gaunate pranešimus, kai keleivis paimtas ir nuvežtas."],
];

export function SubscriptionInfo({ fee, cta }: { fee: string; cta: React.ReactNode }) {
  return (
    <>
      <section className="grid gap-2 rounded-[18px] bg-[var(--brand)] p-5 text-[var(--brand-fg)]">
        <h2 className="text-xl font-bold">Vienas grafikas, viena kaina</h2>
        <p className="opacity-90">Pastovus savaitės grafikas už fiksuotą mėnesio kainą. Mokate tik už savo keliones.</p>
      </section>
      <ol className="card gap-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="grid grid-cols-[32px_1fr] gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent)] font-bold text-[var(--accent-fg)]">{i + 1}</span>
            <div className="grid"><b>{t}</b><span className="text-sm muted">{d}</span></div>
          </li>
        ))}
      </ol>
      <section className="card">
        <h2 className="font-bold">Kas įskaičiuota</h2>
        <ul className="grid gap-2 text-sm">
          {["Kelionės pagal jūsų grafiką", `Platformos mokestis šeimai ${fee} / mėn.: aplikacija, planavimas, pranešimai, vairuotojų patikra`, "10 min. nemokamo laukimo", "Be registracijos mokesčio", "Sutartį galite nutraukti įspėję prieš 30 d."].map((x) => <li key={x} className="flex gap-2"><Ico n="check" size={18} stroke={2.6} className="mt-0.5 flex-none text-[var(--ok)]" />{x}</li>)}
        </ul>
      </section>
      {cta}
    </>
  );
}

const FAMILY: [string, string, string][] = [
  ["family", "Abu tėvai mato keliones", "Pranešimus gauna abu tėvai ar globėjai, net jei gyvena atskirai."],
  ["bell", "Artimieji gali stebėti", "Pakvieskite močiutę ar kitą artimąjį: jie matys kelionę, bet nieko nekeis."],
  ["key", "Slaptas žodis vaikui", "Vairuotojas pasako jūsų šeimos žodį, ir vaikas sėda tik išgirdęs jį."],
  ["group", "Keli keleiviai kartu", "Broliai, sesės ar draugai gali važiuoti viena kelione."],
  ["euro", "Mokestis dalijamas", "Platformos mokestis skaičiuojamas šeimai ir dalijamas tarp mokančių tėvų."],
];

export function FamilyInfo({ cta }: { cta: React.ReactNode }) {
  return (
    <>
      <section className="card gap-1"><h2 className="text-xl font-bold">Visa šeima mato, kas vyksta</h2><p className="muted">Ridu sukurta šeimoms, kuriose keliones planuoja keli žmonės.</p></section>
      {FAMILY.map(([i, t, d]) => (
        <section key={t} className="card grid-cols-[48px_1fr] items-center">
          <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-[var(--soft-blue)] text-[var(--navy)]"><Ico n={i} size={24} /></span>
          <div className="grid"><b>{t}</b><span className="text-sm muted">{d}</span></div>
        </section>
      ))}
      {cta}
    </>
  );
}
