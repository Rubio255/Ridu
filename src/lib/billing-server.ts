import "server-only";
import type Stripe from "stripe";
import { supabaseAdmin } from "./supabase/server";
import { stripe } from "./stripe";
import { effectivePlan, planFromPrice, type SubRow } from "./billing";

const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

// Stripe prenumeratą įrašome į plan_subscriptions (iš webhook arba po apmokėjimo)
export async function syncSubscription(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const pp = item ? planFromPrice(item.price.id) : null;
  if (!pp) { console.error("billing: nežinoma kaina", item?.price.id); return; }
  const db = supabaseAdmin();
  let profileId = sub.metadata?.profile_id;
  if (!profileId) {
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const { data } = await db.from("profiles").select("id").eq("stripe_customer_id", customer).maybeSingle();
    profileId = data?.id;
  }
  if (!profileId) { console.error("billing: nerastas profilis", sub.id); return; }
  await db.from("plan_subscriptions").upsert({
    stripe_subscription_id: sub.id, profile_id: profileId, plan: pp.plan, role: pp.role, status: sub.status,
    current_period_start: iso(item.current_period_start), current_period_end: iso(item.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end, started_at: iso(sub.start_date) ?? new Date().toISOString(),
    immediate_start_consent: sub.metadata?.immediate_start === "yes", updated_at: new Date().toISOString(),
  });
}

// Esama prenumerata ir galiojantis planas
export async function loadPlan(profileId: string) {
  const db = supabaseAdmin();
  const [{ data: subs }, { data: p }] = await Promise.all([
    db.from("plan_subscriptions").select("*").eq("profile_id", profileId).order("updated_at", { ascending: false }).limit(1),
    db.from("profiles").select("plus_until, stripe_customer_id").eq("id", profileId).single(),
  ]);
  const sub = (subs?.[0] ?? null) as (SubRow & { stripe_subscription_id: string; role: string; started_at: string; cancel_at_period_end: boolean; withdrawn_at: string | null }) | null;
  return { sub, plusUntil: (p?.plus_until as string | null) ?? null, customerId: (p?.stripe_customer_id as string | null) ?? null, plan: effectivePlan(sub, p?.plus_until ?? null) };
}

// Stripe klientas vienam profiliui (sukuriamas pirmą kartą). Perduodamas tik el. paštas, vardas ir vidinis ID.
export async function customerFor(profile: { id: string; email: string | null; full_name: string }) {
  const db = supabaseAdmin();
  const { data } = await db.from("profiles").select("stripe_customer_id").eq("id", profile.id).single();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const c = await stripe().customers.create({ email: profile.email ?? undefined, name: profile.full_name || undefined, metadata: { profile_id: profile.id }, preferred_locales: ["lt"] }, { idempotencyKey: `customer-${profile.id}` });
  await db.from("profiles").update({ stripe_customer_id: c.id }).eq("id", profile.id);
  return c.id;
}

// Ištrinant paskyrą: galiojanti Stripe prenumerata atšaukiama iš karto (be grąžinimo, nebent paprašyta per 14 d.)
export async function cancelPaidPlan(profileId: string) {
  if (!process.env.STRIPE_SECRET_KEY) return;
  const { data } = await supabaseAdmin().from("plan_subscriptions").select("stripe_subscription_id").eq("profile_id", profileId).in("status", ["active", "trialing", "past_due", "incomplete"]);
  for (const r of data ?? []) {
    try { await syncSubscription(await stripe().subscriptions.cancel(r.stripe_subscription_id)); }
    catch (e) { console.error("billing cancel", e instanceof Error ? e.message : e); }
  }
}
