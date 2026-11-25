import { Ico } from "@/components/ico";
import Link from "next/link";
import { requireProfile, loadSettings } from "@/lib/auth";
import { requestPlan } from "@/app/actions";
import { PLAN_NAMES, type PlanId } from "@/lib/settings";
import { recommendPlan } from "@/lib/pricing";
import { clientMonthlyValue, planState } from "@/lib/client-plan";
import { eur } from "@/lib/time";
import { PlanPicker, isPlanId } from "@/components/plan-picker";

// Plano pasirinkimas: klientas renkasi, savininkas patvirtina. Rodoma tik galutinė kaina ir kreditas.
export default async function Page() {
  const [me, s] = await Promise.all([requireProfile(), loadSettings()]);
  const [st, mv] = await Promise.all([planState(me.id), clientMonthlyValue(s, me.id)]);
  const rec = mv.value > 0 ? recommendPlan(s, mv.value).id : null;
  const pick = st?.plan_request ?? st?.plan_id ?? rec;
  const chosen: PlanId = isPlanId(pick) ? pick : "family";
  return (
    <>
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link href="/tevai/abonementas" aria-label="Atgal" className="grid h-10 w-10 place-items-center text-2xl text-[var(--navy)]"><Ico n="back" /></Link>
        <h1 className="text-center text-xl font-bold">Abonementų planai</h1>
      </div>
      {st?.plan_request && <p className="rounded-xl bg-[var(--warn-bg)] p-3 text-sm font-semibold">Pasirinkote „{PLAN_NAMES[st.plan_request as PlanId]}“. Planas įsigalios, kai jį patvirtinsime.</p>}
      {mv.value > 0 && <p className="text-sm muted">Pagal jūsų grafiką kelionių vertė apie {eur(mv.value)} per mėnesį.</p>}
      <form action={requestPlan} className="grid gap-3">
        <PlanPicker s={s} name="plan_id" chosen={chosen} rec={rec} current={st?.plan_id} submit="Pasirinkti" />
      </form>
    </>
  );
}
