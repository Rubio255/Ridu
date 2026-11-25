// Mokami planai (Plus, Pro) per Stripe prenumeratas. Grynos funkcijos, kad būtų lengva testuoti.
export type PlanId = "plus" | "pro";
export type PlanRole = "client" | "driver";
export const PLAN_IDS: PlanId[] = ["plus", "pro"];
export const PLAN_NAME: Record<PlanId | "free", string> = { free: "Nemokamas", plus: "Plus", pro: "Pro" };
// Rodomos kainos (su PVM, jei taikomas). Tikroji kaina – Stripe kainoje (Price), kurios ID nurodomas env.
export const PLAN_PRICE: Record<PlanId, Record<PlanRole, number>> = { plus: { client: 4.99, driver: 7.99 }, pro: { client: 9.99, driver: 14.99 } };
export const WITHDRAW_DAYS = 14;

export const priceEnvName = (plan: PlanId, role: PlanRole) => `STRIPE_PRICE_${plan.toUpperCase()}_${role.toUpperCase()}`;
export const priceId = (plan: PlanId, role: PlanRole, env: Record<string, string | undefined> = process.env) => env[priceEnvName(plan, role)] || null;
export function planFromPrice(id: string, env: Record<string, string | undefined> = process.env): { plan: PlanId; role: PlanRole } | null {
  for (const plan of PLAN_IDS) for (const role of ["client", "driver"] as PlanRole[]) if (env[priceEnvName(plan, role)] === id) return { plan, role };
  return null;
}

// Stripe būsenos, kai planas veikia. past_due – Stripe dar bando nuskaityti, todėl planas veikia, kol bandymai baigsis.
export const ACTIVE_STATUSES = ["active", "trialing", "past_due"];
export type SubRow = { plan: PlanId; status: string; current_period_end: string | null };

// Galiojantis planas: mokama prenumerata arba nemokamas Plus iš kvietimų programos
export function effectivePlan(sub: SubRow | null, plusUntil: string | null, now = new Date()): PlanId | "free" {
  if (sub && ACTIVE_STATUSES.includes(sub.status) && (!sub.current_period_end || new Date(sub.current_period_end) > now)) return sub.plan;
  if (plusUntil && new Date(plusUntil) > now) return "plus";
  return "free";
}

// Atsisakymas per 14 d. (tik klientas vartotojas): grąžinama suma, proporcinga nepanaudotam laikotarpiui
export function withdrawRefund(i: { role: PlanRole; startedAt: string; periodStart: string; periodEnd: string; amountPaidCents: number; now?: Date }):
  { ok: true; refundCents: number } | { ok: false; error: "role" | "late" } {
  const now = i.now ?? new Date();
  if (i.role !== "client") return { ok: false, error: "role" };
  if (now.getTime() - new Date(i.startedAt).getTime() > WITHDRAW_DAYS * 864e5) return { ok: false, error: "late" };
  const a = new Date(i.periodStart).getTime(), b = new Date(i.periodEnd).getTime();
  const unused = b > a ? Math.min(1, Math.max(0, (b - now.getTime()) / (b - a))) : 0;
  return { ok: true, refundCents: Math.floor(i.amountPaidCents * unused) };
}

export const WITHDRAW_ERR_LT = { role: "Atsisakyti per 14 d. gali tik klientai vartotojai. Prenumeratą galite atšaukti.", late: "Praėjo 14 dienų nuo užsakymo. Prenumeratą galite atšaukti, ji baigsis laikotarpio pabaigoje." } as const;
