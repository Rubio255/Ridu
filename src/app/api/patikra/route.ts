import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { startCheck } from "@/lib/didit";
import { livenessDue, type LivenessState } from "@/lib/liveness";

// Vairuotojas pradeda tapatybės ar gyvumo patikrą. Priežastį nustato serveris, ne naršyklė.
export async function POST(req: Request) {
  const me = await currentProfile();
  if (!me || me.role !== "driver") return new NextResponse("Unauthorized", { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { newClient?: boolean; childRouteStart?: boolean };
  const { data: d } = await supabaseAdmin().from("drivers").select("identity_verified_at, liveness_checked_at, liveness_due_reason, liveness_review").eq("profile_id", me.id).maybeSingle();
  if (!d) return new NextResponse("Not found", { status: 404 });
  if ((d as LivenessState).liveness_review) return NextResponse.json({ ok: false, error: "review" }, { status: 409 });
  const reason = livenessDue(d as LivenessState, { now: new Date(), driverId: me.id, newClient: !!body.newClient, childRouteStart: !!body.childRouteStart, secret: process.env.LIVENESS_RANDOM_SECRET });
  if (!reason) return NextResponse.json({ ok: true, due: false });
  const r = await startCheck(me.id, reason);
  return NextResponse.json({ ...r, due: true, reason }, { status: r.ok ? 200 : r.error === "disabled" ? 503 : 502 });
}
