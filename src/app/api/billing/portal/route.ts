import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/auth";
import { loadPlan } from "@/lib/billing-server";
import { siteUrl, stripe, stripeEnabled } from "@/lib/stripe";

// Stripe klientų portalas: kortelės keitimas, sąskaitos, atšaukimas laikotarpio pabaigoje
export async function POST() {
  const me = await currentProfile();
  if (!me) return NextResponse.redirect(`${siteUrl()}/prisijungti`, 303);
  const { customerId } = await loadPlan(me.id);
  if (!stripeEnabled() || !customerId) return NextResponse.redirect(`${siteUrl()}/planai?klaida=disabled`, 303);
  const s = await stripe().billingPortal.sessions.create({ customer: customerId, return_url: `${siteUrl()}/planai`, locale: "lt" });
  return NextResponse.redirect(s.url, 303);
}
