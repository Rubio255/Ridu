import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { loadPlan, syncSubscription } from "@/lib/billing-server";
import { withdrawRefund } from "@/lib/billing";
import { siteUrl, stripe, stripeEnabled } from "@/lib/stripe";

// Sutarties atsisakymas per 14 d. (klientas vartotojas): grąžinama už nepanaudotą laiką, planas baigiamas iš karto
export async function POST() {
  const me = await currentProfile();
  if (!me) return NextResponse.redirect(`${siteUrl()}/prisijungti`, 303);
  const back = (q: string) => NextResponse.redirect(`${siteUrl()}/planai?${q}`, 303);
  if (!stripeEnabled()) return back("klaida=disabled");
  const { sub } = await loadPlan(me.id);
  if (!sub || sub.withdrawn_at || !["active", "trialing", "past_due"].includes(sub.status)) return back("klaida=none");

  const s = await stripe().subscriptions.retrieve(sub.stripe_subscription_id, { expand: ["latest_invoice"] });
  const item = s.items.data[0];
  const inv = s.latest_invoice && typeof s.latest_invoice !== "string" ? s.latest_invoice : null;
  const r = withdrawRefund({
    role: sub.role as "client" | "driver",
    startedAt: sub.started_at,
    periodStart: new Date(item.current_period_start * 1000).toISOString(),
    periodEnd: new Date(item.current_period_end * 1000).toISOString(),
    amountPaidCents: inv?.amount_paid ?? 0,
  });
  if (!r.ok) return back(`klaida=${r.error}`);

  if (r.refundCents > 0 && inv?.id) {
    const pays = await stripe().invoicePayments.list({ invoice: inv.id, status: "paid" });
    const pi = pays.data[0]?.payment.payment_intent;
    const intent = typeof pi === "string" ? pi : pi?.id;
    if (intent) await stripe().refunds.create({ payment_intent: intent, amount: r.refundCents, reason: "requested_by_customer", metadata: { profile_id: me.id, kind: "withdrawal" } }, { idempotencyKey: `withdraw-${s.id}` });
  }
  const done = await stripe().subscriptions.cancel(s.id, { invoice_now: false, prorate: false });
  await syncSubscription(done);
  await supabaseAdmin().from("plan_subscriptions").update({ withdrawn_at: new Date().toISOString() }).eq("stripe_subscription_id", s.id);
  return back(`grazinta=${r.refundCents}`);
}
