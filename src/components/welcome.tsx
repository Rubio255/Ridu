import { SavingsCalc } from "./savings-calc";
import { VisitForm } from "./visit-form";
import { driverChecks } from "@/lib/welcome";
import { childOk, type DriverRow } from "@/lib/drivers";
import { addDays, vilniusToday } from "@/lib/time";

const initials = (n: string) => n.split(/\s+/).map((x) => x[0] ?? "").join("").slice(0, 2).toUpperCase();

// Pirmas ekranas: trumpai ir aiškiai – kas veš, ar apsimoka, ir pažintinis pokalbis
export function Welcome({ drivers, guest, mine, greeting, moreHref }: { drivers: DriverRow[]; guest: boolean; mine: boolean; greeting?: string; moreHref?: string }) {
  return (
    <>
      <section className="card gap-4">
        <h1 className="text-balance text-3xl font-bold leading-tight">{greeting ?? "Pavežimas, kuriuo galite pasitikėti"}</h1>
        <p className="muted text-lg">{guest ? "Vežame vaikus, suaugusius ir senjorus Vilniuje pastoviu savaitės grafiku. Prieš sutardami, susipažinkite su vairuotoju asmeniškai." : "Čia matote savo vairuotoją. Jei norite aptarti naują maršrutą, užsakykite pokalbį."}</p>
        <div className="flex flex-wrap gap-2"><a href="#pokalbis" className="btn btn-primary px-5 py-3 text-base">Užsakyti pažintinį pokalbį</a><a href="#skaiciuokle" className="btn px-5 py-3 text-base">Ar man apsimoka?</a></div>
        <ul className="grid gap-2 sm:grid-cols-3">
          {[["Patikrinti vairuotojai", "Dokumentus tikriname ir stebime jų galiojimą"], ["Fiksuota mėnesio kaina", "Be registracijos mokesčio"], ["Be ilgų įsipareigojimų", "Sutartį galite nutraukti įspėję prieš 30 d."]].map(([b, t]) => (
            <li key={b} className="grid rounded-lg bg-[var(--surface-2)] p-3"><b>{b}</b><span className="text-sm muted">{t}</span></li>
          ))}
        </ul>
      </section>
      <section className="card">
        <h2 className="text-xl font-bold">{mine ? "Jūsų vairuotojas" : "Susipažinkite su vairuotoju, kuris jus veš"}</h2>
        <p className="text-sm muted">{mine ? "Šis vairuotojas veža pagal jūsų sutartį." : "Pažintinio pokalbio metu susipažinsite su vairuotoju, kuris vykdys jūsų užsakymą."}</p>
        <div className="grid gap-3 md:grid-cols-2">
          {drivers.map((d) => (
            <article key={d.profile_id} className="flex items-start gap-4 rounded-xl border border-[var(--line)] p-4">
              <div aria-hidden="true" className="grid h-16 w-16 flex-none place-items-center rounded-full bg-[var(--brand)] text-xl font-bold text-[var(--brand-fg)]">{initials(d.profile.full_name || "?")}</div>
              <div className="grid min-w-0 gap-1">
                <h3 className="text-lg font-bold">{d.profile.full_name}</h3>
                <div className="text-sm muted">{d.since_year ? `Vairuoja ${new Date().getFullYear() - d.since_year} m. · ` : ""}{d.car ?? ""}</div>
                {d.bio && <p className="italic">„{d.bio}“</p>}
                <ul className="grid gap-1 text-sm">{driverChecks(d).map((c) => <li key={c}><span className="font-bold text-[var(--ok)]">✓</span> {c}</li>)}</ul>
                <div className="text-sm muted">{childOk(d) ? "Veža vaikus, suaugusius ir senjorus" : "Veža suaugusius ir senjorus"}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <SavingsCalc moreHref={moreHref} />
      <VisitForm guest={guest} drivers={drivers.map((d) => ({ id: d.profile_id, name: d.profile.full_name }))} minDate={addDays(vilniusToday(), 1)} />
    </>
  );
}
