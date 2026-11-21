import { SavingsCalc } from "./savings-calc";
import { VisitForm } from "./visit-form";
import { isVerified, SAFETY } from "@/lib/welcome";
import { childOk, type DriverRow } from "@/lib/drivers";
import { addDays, vilniusToday } from "@/lib/time";

const initials = (n: string) => n.split(/\s+/).map((x) => x[0] ?? "").join("").slice(0, 2).toUpperCase();

// Pirmas ekranas: trumpai ir aiškiai – kas veš, ar apsimoka, ir pažintinis pokalbis
export function Welcome({ drivers, guest, mine, greeting, moreHref }: { drivers: DriverRow[]; guest: boolean; mine: boolean; greeting?: string; moreHref?: string }) {
  return (
    <>
      <section className="card gap-5">
        <h1 className="text-balance text-3xl font-bold leading-tight">{greeting ?? "Pavežimas, kuriuo galite pasitikėti"}</h1>
        <p className="muted text-lg">{guest ? "Vežame vaikus, suaugusius ir senjorus Vilniuje pastoviu savaitės grafiku. Pirmiausia susipažinkite su vairuotoju." : mine ? "Čia matote savo vairuotoją. Jei norite aptarti naują maršrutą, užsakykite pokalbį." : "Susipažinkite su vairuotoju, kuris jus veš."}</p>
        <h2 className="sr-only">{mine ? "Jūsų vairuotojas" : "Vairuotojai"}</h2>
        {drivers.length === 0 && (
          <div className="grid gap-3 rounded-2xl border-2 border-dashed border-[var(--line)] p-5">
            <div className="flex items-center gap-4">
              <div aria-hidden="true" className="grid h-20 w-20 flex-none place-items-center rounded-full bg-[var(--surface-2)] text-3xl">🚗</div>
              <div className="grid gap-1"><h3 className="text-xl font-bold">Jūsų vairuotojas</h3><p className="muted">Su vairuotoju susipažinsite asmeniškai dar prieš pirmą kelionę.</p></div>
            </div>
            <a href="#pokalbis" className="btn btn-primary py-3 text-center text-base">Susitikti su vairuotoju</a>
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {drivers.map((d) => (
            <article key={d.profile_id} className="grid gap-4 rounded-2xl border-2 border-[var(--line)] p-5">
              <div className="flex items-center gap-4">
                <div aria-hidden="true" className="grid h-20 w-20 flex-none place-items-center rounded-full bg-[var(--brand)] text-2xl font-bold text-[var(--brand-fg)]">{initials(d.profile.full_name || "?")}</div>
                <div className="grid min-w-0 gap-1">
                  <h3 className="text-xl font-bold">{d.profile.full_name}</h3>
                  <div className="muted">{d.since_year ? `Vairuoja ${new Date().getFullYear() - d.since_year} m. · ` : ""}{d.car ?? ""}</div>
                </div>
              </div>
              {isVerified(d) && <a href="#saugumas" className="pill p-ok justify-self-start text-sm normal-case no-underline">✓ Patikimas ir patikrintas vairuotojas</a>}
              {d.bio && <p className="text-lg italic">„{d.bio}“</p>}
              <div className="text-sm muted">{childOk(d) ? "Veža vaikus, suaugusius ir senjorus" : "Veža suaugusius ir senjorus"}</div>
              <a href="#pokalbis" className="btn btn-primary py-3 text-center text-base">Susitikti su vairuotoju</a>
            </article>
          ))}
        </div>
        <a href="#skaiciuokle" className="btn justify-self-start px-5 py-3 text-base">Ar man apsimoka?</a>
        <ul className="grid gap-2 sm:grid-cols-3">
          {[["Patikrinti vairuotojai", "Dokumentus tikriname ir stebime jų galiojimą"], ["Fiksuota mėnesio kaina", "Be registracijos mokesčio"], ["Be ilgų įsipareigojimų", "Sutartį galite nutraukti įspėję prieš 30 d."]].map(([b, t]) => (
            <li key={b} className="grid rounded-lg bg-[var(--surface-2)] p-3"><b>{b}</b><span className="text-sm muted">{t}</span></li>
          ))}
        </ul>
      </section>
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
      <VisitForm guest={guest} drivers={drivers.map((d) => ({ id: d.profile_id, name: d.profile.full_name }))} minDate={addDays(vilniusToday(), 1)} />
    </>
  );
}
