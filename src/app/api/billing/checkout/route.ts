import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/auth";
import { customerFor, loadPlan } from "@/lib/billing-server";
import { priceId, type PlanId, type PlanRole } from "@/lib/billing";
import { siteUrl, stripe, stripeEnabled } from "@/lib/stripe";

// Plano užsakymas: nukreipia į Stripe Checkout. Kortelės duomenys niekada nepasiekia mūsų serverio.
export async function POST(req: Request) {
  const me = await currentProfile();
  if (!me) return NextResponse.redirect(`${siteUrl()}/prisijungti`, 303);
  const back = (q: string) => NextResponse.redirect(`${siteUrl()}/planai?${q}`, 303);
  if (!stripeEnabled()) return back("klaida=disabled");
  if (me.role === "owner") return back("klaida=role");
  const f = await req.formData();
  const plan = String(f.get("plan")) as PlanId;
  const role: PlanRole = me.role === "driver" ? "driver" : "client";
  const price = plan === "plus" || plan === "pro" ? priceId(plan, role) : null;
  if (!price) return back("klaida=plan");
  // Klientas vartotojas turi aiškiai paprašyti, kad planas veiktų iš karto (atsisakymo teisė, sąlygų 12 p.)
  const immediate = f.get("immediate") === "yes";
  if (role === "client" && !immediate) return back("klaida=immediate");
  const cur = await loadPlan(me.id);
  if (cur.sub && ["active", "trialing", "past_due"].includes(cur.sub.status)) return back("klaida=active");

  const customer = await customerFor(me);
  const s = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: me.id,
    line_items: [{ price, quantity: 1 }],
    locale: "lt",
    success_url: `${siteUrl()}/planai?ok=1`,
    cancel_url: `${siteUrl()}/planai`,
    subscription_data: { metadata: { profile_id: me.id, plan, role, immediate_start: immediate ? "yes" : "no" } },
    // Vairuotojas – verslininkas: gali nurodyti PVM kodą sąskaitai
    ...(role === "driver" ? { tax_id_collection: { enabled: true }, customer_update: { name: "auto" as const, address: "auto" as const } } : {}),
    billing_address_collection: role === "driver" ? "required" : "auto",
  });
  return NextResponse.redirect(s.url!, 303);
}
