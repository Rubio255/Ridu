import { Ico } from "@/components/ico";
import { plansOf, type PlanId, type Settings } from "@/lib/settings";
import { standardTripValue } from "@/lib/pricing";
import { eur } from "@/lib/time";

const FOR: Record<PlanId, string> = {
  basic: "Vaikui 2 kartus per savaitę arba senjorui kartą per savaitę į abi puses",
  family: "Dviem vaikams 3 kartus per savaitę arba vienam vaikui kasdien",
  premium: "Daug kelionių ir pageidaujamas vairuotojas (kai jis patvirtina)",
};
const INCLUDED = ["Patikimas ir patikrintas vairuotojas", "Kelionės stebėjimas gyvai ir pranešimai", "Nepanaudotas kreditas pereina į kitą mėnesį", "Platformos mokestis jau įskaičiuotas"];

export const isPlanId = (x: unknown): x is PlanId => x === "basic" || x === "family" || x === "premium";

// Planų kortelės (vieša pradžia ir kliento programėlė). Rodoma tik galutinė kaina ir kreditas, ne formulė.
export function PlanPicker({ s, name, chosen, rec, current, submit }: { s: Settings; name: string; chosen: PlanId; rec?: PlanId | null; current?: string | null; submit: string }) {
  // Tipinė kelionė (8 km, 22 min.) – kiek kelionių telpa į kreditą ir kiek vidutiniškai kainuoja viena
  const typical = standardTripValue(s, 22, 8, "child");
  return (
    <>
      {plansOf(s).map((p) => {
        const trips = Math.floor(p.credit / typical);
        return (
          <label key={p.id} className="card plan-card cursor-pointer gap-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2"><b className="text-lg">{p.name}</b>
                {p.id === "family" && <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-bold text-[var(--accent-fg)]">Populiariausias</span>}
                {p.id === rec && p.id !== "family" && <span className="pill p-ok">Jums tinka</span>}
                {p.id === current && <span className="pill p-info">Dabartinis</span>}</div>
              <input type="radio" name={name} value={p.id} defaultChecked={p.id === chosen} className="mt-1 h-5 w-5 accent-[var(--navy)]" />
            </div>
            <span className="text-sm muted">Apie {trips} kelionių / mėn. · {FOR[p.id]}</span>
            <span className="mt-1"><b className="num text-2xl">{eur(p.price)}</b> <span className="font-semibold">/ mėn.</span></span>
            <span className="text-sm muted">≈ {eur(p.price / trips)} / kelionė · {eur(p.credit)} kredito{p.credit > p.price ? ` (+${eur(p.credit - p.price)})` : ""}</span>
          </label>
        );
      })}
      <ul className="grid gap-2 py-1 text-sm">{INCLUDED.map((x) => <li key={x} className="flex items-center gap-2"><span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-[var(--ok)] text-white"><Ico n="check" size={12} stroke={3.2} /></span>{x}</li>)}</ul>
      <p className="text-xs muted">Kelionių skaičius apytikslis, skaičiuojant 8 km kelionę. Viršijus kreditą, papildomos kelionės skaičiuojamos įprasta kaina.</p>
      <button className="btn btn-primary btn-lg">{submit}</button>
    </>
  );
}
