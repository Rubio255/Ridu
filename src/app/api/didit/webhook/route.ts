import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { afterResult, diditResult, verifyDiditSignature } from "@/lib/liveness";

// Didit praneša patikros rezultatą. Saugome tik rezultatą ir laiką; decision (veido, dokumento duomenys) neišsaugomas.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyDiditSignature(raw, req.headers.get("x-signature"), req.headers.get("x-timestamp"), process.env.DIDIT_WEBHOOK_SECRET ?? "")) return new NextResponse("Bad signature", { status: 401 });
  const ev = JSON.parse(raw) as { session_id?: string; status?: string };
  const result = ev.status ? diditResult(ev.status) : null;
  if (!ev.session_id || !result) return NextResponse.json({ ok: true });
  const db = supabaseAdmin();
  const { data: chk } = await db.from("driver_identity_checks").select("id, driver_id, kind, status").eq("provider_session_id", ev.session_id).maybeSingle();
  if (!chk || chk.status !== "pending") return NextResponse.json({ ok: true }); // nežinoma arba jau apdorota (pakartotinis pranešimas)
  const at = new Date().toISOString();
  await db.from("driver_identity_checks").update({ status: result, checked_at: at }).eq("id", chk.id).eq("status", "pending");
  const { data: d } = await db.from("drivers").select("liveness_failed").eq("profile_id", chk.driver_id).maybeSingle();
  const next: Record<string, unknown> = afterResult(d?.liveness_failed ?? 0, result === "passed");
  if (result === "passed") { next.liveness_checked_at = at; if (chk.kind === "initial") next.identity_verified_at = at; }
  await db.from("drivers").update(next).eq("profile_id", chk.driver_id);
  return NextResponse.json({ ok: true });
}
