import "server-only";
import { supabaseAdmin } from "./supabase/server";
import type { DueReason } from "./liveness";

// Didit (didit.me) tapatybės ir gyvumo patikra. Įjungiama env raktais; be jų funkcija išjungta,
// o vairuotojas tikrinamas vaizdo skambučiu su administratoriumi.
//   DIDIT_API_KEY             – x-api-key
//   DIDIT_WEBHOOK_SECRET      – webhook secret_shared_key
//   DIDIT_WORKFLOW_INITIAL    – dokumentas + selfis su gyvumu (registruojantis)
//   DIDIT_WORKFLOW_LIVENESS   – gyvumas + veido atitikimas (pakartotinė patikra, ~10 s)
//   LIVENESS_RANDOM_SECRET    – druska atsitiktinėms patikros dienoms
const BASE = "https://verification.didit.me";

export const diditEnabled = () => !!(process.env.DIDIT_API_KEY && process.env.DIDIT_WEBHOOK_SECRET && process.env.DIDIT_WORKFLOW_INITIAL && process.env.DIDIT_WORKFLOW_LIVENESS);

export async function startCheck(driverId: string, reason: DueReason) {
  if (!diditEnabled()) return { ok: false as const, error: "disabled" };
  const kind = reason === "initial" ? "initial" : "liveness";
  const workflow = kind === "initial" ? process.env.DIDIT_WORKFLOW_INITIAL! : process.env.DIDIT_WORKFLOW_LIVENESS!;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const res = await fetch(`${BASE}/v3/session/`, {
    method: "POST",
    headers: { "x-api-key": process.env.DIDIT_API_KEY!, "content-type": "application/json" },
    // vendor_data – tik vidinis vairuotojo id; vardų, el. pašto ir telefono Didit neperduodame
    body: JSON.stringify({ workflow_id: workflow, vendor_data: driverId, callback: `${site}/vairuotojas?patikra=1`, language: "lt" }),
    cache: "no-store",
  });
  if (!res.ok) { console.error("didit session", res.status); return { ok: false as const, error: "provider" }; }
  const s = (await res.json()) as { session_id: string; url: string };
  const { error } = await supabaseAdmin().from("driver_identity_checks").insert({ driver_id: driverId, kind, reason, method: "didit", provider_session_id: s.session_id });
  if (error) { console.error("identity check insert", error.code); return { ok: false as const, error: "db" }; }
  return { ok: true as const, url: s.url };
}
