"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner, requireProfile, loadSettings } from "@/lib/auth";
import { geocode, route } from "@/lib/maps";
import { quoteSubscription, blockMin, cancelFeePct, type SubLike } from "@/lib/pricing";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { addDays, vilniusToday, vilniusToDate, toMin } from "@/lib/time";
import { generateTrips } from "@/lib/trips";

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/prisijungti");
}

/* ---------- Bendros pagalbinės ---------- */

async function existingSubs(): Promise<SubLike[]> {
  const { data } = await supabaseAdmin().from("subscriptions")
    .select("id, weekdays, period, pickup_time, extra_kids, drive_min, status").in("status", ["active", "pending"]);
  const s = await loadSettings();
  return (data ?? []).map((x) => ({ ...x, pickup_time: String(x.pickup_time).slice(0, 5), block_min: blockMin(s, x.drive_min) }));
}

function dayMinutes(subs: SubLike[], wd: number) {
  return subs.filter((x) => x.weekdays.includes(wd)).reduce((a, x) => a + x.block_min, 0);
}

async function assertGuardian(childId: string, profileId: string) {
  const { data } = await supabaseAdmin().from("child_guardians").select("child_id").eq("child_id", childId).eq("profile_id", profileId).maybeSingle();
  if (!data) throw new Error("Neturite teisės užsakyti šiam vaikui.");
}

type SubInput = { child_id: string; from_place_id: string; to_place_id: string; weekdays: number[]; period: "am" | "pm"; pickup_time: string; extra_kids: number; months: number };

async function computeQuote(me: string, input: SubInput) {
  await assertGuardian(input.child_id, me);
  const db = supabaseAdmin();
  const { data: places } = await db.from("places").select("id, address, lat, lng").in("id", [input.from_place_id, input.to_place_id]);
  const f = places?.find((p) => p.id === input.from_place_id), t = places?.find((p) => p.id === input.to_place_id);
  if (!f || !t || f.id === t.id) return { s: DEFAULT_SETTINGS, q: null, r: null, error: "Pasirinkite skirtingas paėmimo ir nuvežimo vietas." };
  const s = await loadSettings();
  const time = input.period === "am" ? s.morning_start : input.pickup_time;
  const dep = vilniusToDate(addDays(vilniusToday(), 7), time);
  const r = await route(f.lat != null ? f : null, t.lat != null ? t : null, dep);
  const subs = await existingSubs();
  const q = quoteSubscription(s, subs, { ...input, pickup_time: time, km: r.km, driveMin: r.min });
  // Dienos darbo laiko riba: jei viršija, laikas laikomas pilnu
  const bm = blockMin(s, r.min);
  if (q.ok && input.weekdays.some((w) => dayMinutes(subs, w) + bm > s.day_limit_h * 60)) q.full = true;
  return { s, q, r, error: q.ok ? null : q.reason ?? "Negalima užsakyti." };
}

/* ---------- Klientas (tėvai) ---------- */

export async function quoteAction(input: SubInput) {
  const me = await requireProfile();
  const { q, error } = await computeQuote(me.id, input);
  if (!q || error) return { ok: false as const, error };
  // Klientui grąžinama tik galutinė kaina, be kainodaros detalių
  return { ok: true as const, full: q.full, perTrip: q.perTrip, monthly: q.monthly, tripsPerMonth: q.tripsPerMonth, kids: q.kids };
}

export async function createSubscription(input: SubInput, bidMonthly?: number) {
  const me = await requireProfile();
  const { s, q, r, error } = await computeQuote(me.id, input);
  if (!q || !r || error) return { ok: false as const, error };
  let monthly = q.monthly, perTrip = q.perTrip, isBid = false;
  if (q.full) {
    if (!bidMonthly || bidMonthly < q.monthly) return { ok: false as const, error: `Pasiūlymas turi būti ne mažesnis nei ${q.monthly} €.` };
    isBid = true; monthly = Math.round(bidMonthly);
    perTrip = Math.round((monthly / q.kids / ((input.weekdays.length * 52) / 12)) * 100) / 100;
  }
  const { error: e } = await supabaseAdmin().from("subscriptions").insert({
    child_id: input.child_id, payer_id: me.id, from_place_id: input.from_place_id, to_place_id: input.to_place_id,
    weekdays: input.weekdays, period: input.period, pickup_time: input.period === "am" ? s.morning_start : input.pickup_time,
    extra_kids: input.extra_kids, months: input.months, km: r.km, drive_min: r.min,
    per_trip_eur: perTrip, monthly_eur: monthly, is_bid: isBid, status: "pending",
  });
  if (e) return { ok: false as const, error: "Nepavyko išsaugoti. Bandykite dar kartą." };
  revalidatePath("/tevai");
  return { ok: true as const, isBid };
}

export async function addPlace(fd: FormData) {
  const me = await requireProfile();
  const address = String(fd.get("address") ?? "").trim(), label = String(fd.get("label") ?? "").trim();
  if (!address || !label) return;
  const loc = await geocode(address.includes("Vilnius") ? address : `${address}, Vilnius`);
  await supabaseAdmin().from("places").insert({ profile_id: me.id, label, kind: String(fd.get("kind") ?? "other"), address, lat: loc?.lat ?? null, lng: loc?.lng ?? null });
  revalidatePath("/tevai/vaikai");
}

export async function cancelTrip(fd: FormData) {
  const me = await requireProfile();
  const id = String(fd.get("id"));
  const db = supabaseAdmin();
  const { data: t } = await db.from("trips").select("id, child_id, pickup_at, status").eq("id", id).single();
  if (!t || t.status !== "scheduled") return;
  if (me.role !== "owner") await assertGuardian(t.child_id, me.id);
  const s = await loadSettings();
  const hours = (new Date(t.pickup_at).getTime() - Date.now()) / 36e5;
  await db.from("trips").update({ status: "cancelled", cancel_fee_pct: cancelFeePct(s, hours) }).eq("id", id);
  revalidatePath("/tevai"); revalidatePath("/savininkas");
}

/* ---------- Savininkas ---------- */

export async function decideSubscription(fd: FormData) {
  await requireOwner();
  const id = String(fd.get("id")), decision = String(fd.get("decision"));
  const db = supabaseAdmin();
  if (decision === "active") {
    const time = String(fd.get("pickup_time") ?? "");
    const patch: Record<string, unknown> = { status: "active", starts_on: vilniusToday() };
    if (time) patch.pickup_time = time;
    await db.from("subscriptions").update(patch).eq("id", id);
    await generateTrips(id);
  } else if (decision === "ended") {
    await db.from("subscriptions").update({ status: "ended", ends_on: vilniusToday() }).eq("id", id);
    await db.from("trips").update({ status: "cancelled" }).eq("subscription_id", id).eq("status", "scheduled").gt("pickup_at", new Date().toISOString());
  } else {
    await db.from("subscriptions").update({ status: "rejected" }).eq("id", id);
  }
  revalidatePath("/savininkas", "layout");
}

export async function setTripStatus(fd: FormData) {
  await requireOwner();
  await supabaseAdmin().from("trips").update({ status: String(fd.get("status")) }).eq("id", String(fd.get("id")));
  revalidatePath("/savininkas");
}

export async function inviteClient(fd: FormData) {
  await requireOwner();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  const db = supabaseAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/auth/callback`, data: { full_name: String(fd.get("full_name") ?? "") } });
  if (error || !data.user) throw new Error("Nepavyko pakviesti: " + (error?.message ?? ""));
  await db.from("profiles").upsert({ id: data.user.id, email, full_name: String(fd.get("full_name") ?? ""), phone: String(fd.get("phone") ?? "") || null, contract_no: String(fd.get("contract_no") ?? "") || null, role: "client" });
  revalidatePath("/savininkas/klientai");
}

export async function setClientActive(fd: FormData) {
  await requireOwner();
  await supabaseAdmin().from("profiles").update({ active: fd.get("active") === "1" }).eq("id", String(fd.get("id"))).eq("role", "client");
  revalidatePath("/savininkas/klientai");
}

export async function addChild(fd: FormData) {
  await requireOwner();
  const db = supabaseAdmin();
  const { data: c } = await db.from("children").insert({
    first_name: String(fd.get("first_name")), birth_year: Number(fd.get("birth_year")) || null,
    seat: String(fd.get("seat") ?? "Kėdutė"), notes: String(fd.get("notes") ?? "") || null,
  }).select("id").single();
  const guardians = fd.getAll("guardians").map(String).filter(Boolean);
  if (c && guardians.length) await db.from("child_guardians").insert(guardians.map((g) => ({ child_id: c.id, profile_id: g })));
  revalidatePath("/savininkas/klientai");
}

export async function saveSettings(fd: FormData) {
  await requireOwner();
  const cur = await loadSettings();
  const next: Record<string, unknown> = { ...cur };
  for (const k of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const def = DEFAULT_SETTINGS[k];
    if (typeof def === "boolean") next[k] = fd.get(k) === "on";
    else if (fd.has(k)) {
      const v = String(fd.get(k));
      if (typeof def === "number") { const n = parseFloat(v.replace(",", ".")); if (!isNaN(n)) next[k] = n; }
      else if (/^\d{2}:\d{2}$/.test(v)) next[k] = v;
    }
  }
  if (toMin(String(next.morning_start)) >= toMin(String(next.morning_end))) throw new Error("Rytinio maršruto pradžia turi būti anksčiau nei pabaiga.");
  await supabaseAdmin().from("settings").update({ data: next, updated_at: new Date().toISOString() }).eq("id", 1);
  revalidatePath("/savininkas", "layout");
}
