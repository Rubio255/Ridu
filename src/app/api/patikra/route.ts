import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { startCheck } from "@/lib/didit";
import { GUARD_LT, guardCheck, livenessDue, type LivenessState } from "@/lib/liveness";

// Vairuotojas pradeda tapatybės ar gyvumo patikrą. Priežastį nustato serveris, ne naršyklė.
// Prieš mokamą Didit: prisijungęs vairuotojas (registracija saugoma Turnstile), patvirtintas el. paštas ir telefonas,
// patikrintas LTSA leidimas, ne daugiau 2 sesijų per 24 h vienam ir dienos limitas visai platformai.
export async function POST(req: Request) {
  const me = await currentProfile();
  if (!me || me.role !== "driver") return new NextResponse("Unauthorized", { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { newClient?: boolean; childRouteStart?: boolean };
  const db = supabaseAdmin();
  const { data: d } = await db.from("drivers").select("identity_verified_at, liveness_checked_at, liveness_due_reason, liveness_review, ltsa_verified_at").eq("profile_id", me.id).maybeSingle();
  if (!d) return new NextResponse("Not found", { status: 404 });
  if (d.liveness_review) return NextResponse.json({ ok: false, error: "review" }, { status: 409 });
  const reason = livenessDue(d as LivenessState, { now: new Date(), driverId: me.id, newClient: !!body.newClient, childRouteStart: !!body.childRouteStart, secret: process.env.LIVENESS_RANDOM_SECRET });
  if (!reason) return NextResponse.json({ ok: true, due: false });

  const dayAgo = new Date(Date.now() - 864e5).toISOString();
  const today = new Date(new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Vilnius" }) + "T00:00:00+02:00").toISOString();
  const [{ data: u }, mine, all] = await Promise.all([
    db.auth.admin.getUserById(me.id),
    db.from("driver_identity_checks").select("id", { count: "exact", head: true }).eq("driver_id", me.id).eq("method", "didit").gte("created_at", dayAgo),
    db.from("driver_identity_checks").select("id", { count: "exact", head: true }).eq("method", "didit").gte("created_at", today),
  ]);
  const err = guardCheck({
    emailConfirmed: !!u.user?.email_confirmed_at,
    phoneConfirmed: !!u.user?.phone_confirmed_at,
    permitVerified: !!d.ltsa_verified_at,
    driverSessions24h: mine.count ?? 0,
    platformSessionsToday: all.count ?? 0,
    dailyCap: Number(process.env.LIVENESS_DAILY_CAP) || undefined,
  });
  if (err) {
    if (err === "platform_limit") console.warn("liveness daily cap reached");
    return NextResponse.json({ ok: false, error: err, message: GUARD_LT[err] }, { status: 429 });
  }
  const r = await startCheck(me.id, reason);
  return NextResponse.json({ ...r, due: true, reason }, { status: r.ok ? 200 : r.error === "disabled" ? 503 : 502 });
}
