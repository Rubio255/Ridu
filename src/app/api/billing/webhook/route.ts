import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing-server";
import { notifyProfiles } from "@/lib/push";

// Stripe webhook: plano būsena, nepavykę mokėjimai. Parašas tikrinamas su STRIPE_WEBHOOK_SECRET.
export async function POST(req: Request) {
  if (!stripeEnabled()) return new NextResponse("disabled", { status: 503 });
  const raw = await req.text();
  let ev: Stripe.Event;
  try {
    ev = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse("bad signature", { status: 400 });
  }
  const db = supabaseAdmin();
  // Tas pats įvykis apdorojamas tik kartą
  const { error: dup } = await db.from("billing_events").insert({ id: ev.id, type: ev.type });
  if (dup) return NextResponse.json({ ok: true, duplicate: dup.code === "23505" }, { status: dup.code === "23505" ? 200 : 500 });

  try {
    switch (ev.type) {
      case "checkout.session.completed": {
        const s = ev.data.object;
        if (s.mode === "subscription" && s.subscription) {
          const id = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
          await syncSubscription(await stripe().subscriptions.retrieve(id));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // Imame naujausią būseną iš Stripe, nes įvykiai gali ateiti ne iš eilės
        await syncSubscription(await stripe().subscriptions.retrieve(ev.data.object.id));
        break;
      case "invoice.payment_failed": {
        const inv = ev.data.object;
        const customer = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
        const { data: p } = await db.from("profiles").select("id").eq("stripe_customer_id", customer ?? "").maybeSingle();
        if (p) await notifyProfiles([p.id], "Nepavyko nuskaityti mokėjimo", "Atnaujinkite kortelę, kad planas veiktų toliau.", "/planai");
        break;
      }
    }
  } catch (e) {
    // Leidžiame Stripe pakartoti: pašaliname žymą
    await db.from("billing_events").delete().eq("id", ev.id);
    console.error("billing webhook", ev.type, e instanceof Error ? e.message : e);
    return new NextResponse("error", { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
