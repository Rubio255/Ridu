import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { requestPlan } from "@/app/actions";
import { plansOf, PLAN_NAMES, type PlanId } from "@/lib/settings";
import { recommendPlan } from "@/lib/pricing";
import { clientMonthlyValue, planState } from "@/lib/client-plan";
import { eur } from "@/lib/time";

const FOR: Record<PlanId, string> = {
  basic: "Vaikui 2 kartus per savaitę arba senjorui kartą per savaitę į abi puses",
  family: "Dviem vaikams 3 kartus per savaitę arba vienam vaikui kasdien",
  premium: "Daug kelionių ir pageidaujamas vairuotojas (kai jis patvirtina)",
};
const INCLUDED = ["Patikimas ir patikrintas vairuotojas", "Kelionės stebėjimas gyvai ir pranešimai", "Nepanaudotas kreditas pereina į kitą mėnesį", "Platformos mokestis jau įskaičiuotas"];

// Plano pasirinkimas: klientas renkasi, savininkas patvirtina. Rodoma tik galutinė kaina ir kreditas.
export default async function Page() {
  const [me, s] = await Promise.all([requireProfile(), loadSettings()]);
  const [st, mv] = await Promise.all([planState(me.id), clientMonthlyValue(s, me.id)]);
  const rec = mv.value > 0 ? recommendPlan(s, mv.value).id : null;
  const chosen = st?.plan_request ?? st?.plan_id ?? rec ?? "basic";
  return (
    <>
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link href="/tevai/abonementas" aria-label="Atgal" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-lg">←</Link>
        <h1 className="text-center text-lg font-bold">Pasirinkite planą</h1>
      </div>
      {st?.plan_request && <p className="rounded-xl bg-[var(--warn-bg)] p-3 text-sm font-semibold">Pasirinkote „{PLAN_NAMES[st.plan_request as PlanId]}“. Planas įsigalios, kai jį patvirtinsime.</p>}
      {mv.value > 0 && <p className="text-sm muted">Pagal jūsų grafiką kelionių vertė apie {eur(mv.value)} per mėnesį.</p>}
      <form action={requestPlan} className="grid gap-3">
        {plansOf(s).map((p) => (
          <label key={p.id} className="card cursor-pointer gap-1 has-[:checked]:border-2 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><b className="text-lg">{p.name}</b>
                {p.id === rec && <span className="pill p-accent">Jums tinkamiausias</span>}
                {p.id === st?.plan_id && <span className="pill p-ok">Dabartinis</span>}</span>
              <input type="radio" name="plan_id" value={p.id} defaultChecked={p.id === chosen} className="h-5 w-5 accent-[var(--brand)]" />
            </div>
            <span className="text-sm muted">{FOR[p.id]}</span>
            <span><b className="num text-2xl">{eur(p.price)}</b> <span className="muted">/ mėn.</span></span>
            <span className="text-sm">Kelionėms {eur(p.credit)} kredito{p.credit > p.price ? ` (+${eur(p.credit - p.price)} dovanų)` : ""}</span>
          </label>
        ))}
        <ul className="grid gap-1.5 text-sm">{INCLUDED.map((x) => <li key={x}><span className="font-bold text-[var(--ok)]">✓</span> {x}</li>)}</ul>
        <p className="text-xs muted">Viršijus kreditą, papildomos kelionės skaičiuojamos įprasta kaina. Planą galite keisti kitam mėnesiui.</p>
        <button className="btn btn-primary btn-lg">Tęsti</button>
      </form>
    </>
  );
}
