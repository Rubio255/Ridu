import "server-only";
import Stripe from "stripe";

// Stripe įjungiamas env raktais. Testui: sk_test_ ir whsec_ raktai; tikriems mokėjimams pakeiskite į sk_live_ ir live webhook raktą.
//   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
//   STRIPE_PRICE_PLUS_CLIENT, STRIPE_PRICE_PRO_CLIENT, STRIPE_PRICE_PLUS_DRIVER, STRIPE_PRICE_PRO_DRIVER (price_... ID)
let client: Stripe | null = null;
export const stripeEnabled = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY nenustatytas");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY, { appInfo: { name: "Ridu" } });
  return client;
}
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
