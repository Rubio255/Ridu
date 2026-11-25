import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { loadPlan } from "@/lib/billing-server";
import { PLAN_NAME, PLAN_PRICE, WITHDRAW_DAYS, WITHDRAW_ERR_LT, type PlanId } from "@/lib/billing";
import { stripeEnabled } from "@/lib/stripe";
import { Logo } from "@/components/logo";

export const dynamic = "force-dynamic";

const HOME: Record<string, string> = { owner: "/savininkas", driver: "/vairuotojas", client: "/tevai" };
const ERR: Record<string, string> = {
  disabled: "Mokėjimai dar neįjungti. Pabandykite vėliau.",
  role: WITHDRAW_ERR_LT.role, late: WITHDRAW_ERR_LT.late,
  plan: "Šis planas šiuo metu neprieinamas.",
  immediate: "Pažymėkite, kad planas pradėtų veikti iš karto.",
  active: "Jau turite galiojantį planą. Jį keisti galite per „Valdyti planą“.",
  none: "Galiojančio plano nėra.",
};
const PERKS: Record<PlanId, Record<"client" | "driver", string>> = {
  plus: { client: "Neribotos užklausos, matote visus pasiūlymus", driver: "Neriboti pasisiūlymai, išplėsti filtrai" },
  pro: { client: "Viskas iš Plus, sutarčių šablonai, užklausa rodoma pirmoji", driver: "Viskas iš Plus, sutarčių šablonai, paryškinti pasiūlymai" },
};
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("lt-LT", { timeZone: "Europe/Vilnius" }) : "");

// Planai: užsakymas per Stripe, valdymas per Stripe portalą, atsisakymas per 14 d.
export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; klaida?: string; grazinta?: string }> }) {
  const p = await requireProfile();
  const q = await searchParams;
  const role = p.role === "driver" ? "driver" : "client";
  const { sub, plan, plusUntil, customerId } = await loadPlan(p.id);
  const paid = !!sub && ["active", "trialing", "past_due"].includes(sub.status) && !sub.withdrawn_at;
  const canWithdraw = paid && role === "client" && Date.now() - new Date(sub!.started_at).getTime() <= WITHDRAW_DAYS * 864e5;
  const on = stripeEnabled();
  return (
    <main className="mx-auto grid max-w-xl gap-4 px-4 py-6">
      <div className="flex items-center gap-3"><Logo /><h1 className="text-2xl font-bold">Planai</h1></div>
      {q.ok && <div className="card text-sm">Ačiū. Planas įsigalios, kai tik Stripe patvirtins mokėjimą (dažniausiai per kelias sekundes).</div>}
      {q.grazinta && <div className="card text-sm">Sutarties atsisakyta. Grąžinsime {(Number(q.grazinta) / 100).toFixed(2)} € į jūsų kortelę per 5–10 d.</div>}
      {q.klaida && <div className="card text-sm text-[var(--bad)]">{ERR[q.klaida] ?? "Nepavyko. Pabandykite dar kartą."}</div>}

      <div className="card gap-1">
        <div className="text-sm muted">Dabartinis planas</div>
        <div className="text-xl font-bold">{PLAN_NAME[plan]}</div>
        {paid && sub!.status === "past_due" && <div className="text-sm text-[var(--bad)]">Nepavyko nuskaityti mokėjimo. Atnaujinkite kortelę.</div>}
        {paid && <div className="text-sm muted">{sub!.cancel_at_period_end ? `Baigsis ${day(sub!.current_period_end)}` : `Atsinaujins ${day(sub!.current_period_end)}`}</div>}
        {!paid && plan === "plus" && plusUntil && <div className="text-sm muted">Dovana iki {day(plusUntil)}</div>}
        {customerId && on && (
          <form action="/api/billing/portal" method="post"><button className="btn mt-2">Valdyti planą, kortelę ir sąskaitas</button></form>
        )}
        {canWithdraw && on && (
          <form action="/api/billing/withdraw" method="post" className="mt-2 grid gap-1">
            <button className="btn justify-self-start">Atsisakyti sutarties</button>
            <span className="text-xs muted">Per {WITHDRAW_DAYS} d. nuo užsakymo. Grąžinsime už nepanaudotą laiką, planas baigsis iš karto.</span>
          </form>
        )}
      </div>

      {!paid && p.role !== "owner" && (["plus", "pro"] as PlanId[]).map((id) => (
        <form key={id} action="/api/billing/checkout" method="post" className="card gap-2">
          <input type="hidden" name="plan" value={id} />
          <div className="flex items-baseline justify-between"><b className="text-lg">{PLAN_NAME[id]}</b><span><b>{PLAN_PRICE[id][role].toFixed(2)} €</b> <span className="text-sm muted">/ mėn.</span></span></div>
          <div className="text-sm muted">{PERKS[id][role]}</div>
          {role === "client" && (
            <label className="flex items-start gap-2 text-xs"><input type="checkbox" name="immediate" value="yes" required /> Prašau, kad planas veiktų iš karto. Atsisakius per {WITHDRAW_DAYS} d. grąžinama už nepanaudotą laiką.</label>
          )}
          <button className="btn btn-primary" disabled={!on}>Užsakyti {PLAN_NAME[id]}</button>
        </form>
      ))}
      <p className="text-xs muted">Mokama kortele per Stripe. Kortelės duomenų nesaugome. Atšaukti galite bet kada, planas veiks iki apmokėto laikotarpio pabaigos. <Link href="/privatumas" className="underline">Privatumas</Link></p>
      <Link href={HOME[p.role] ?? "/"} className="btn justify-self-start">← Grįžti</Link>
    </main>
  );
}
