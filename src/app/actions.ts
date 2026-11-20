"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner, requireProfile, requireStaff, requireDriver, loadSettings, currentProfile, type Profile } from "@/lib/auth";
import { quickCalc, VISIT_HOW, VISIT_WHO } from "@/lib/welcome";
import { bestDriverQuote, loadDrivers, affectedTrips, absenceOn, ABSENCE_LT, childOk } from "@/lib/drivers";
import { offerNext } from "@/lib/offers";
import { familyAlreadyPays } from "@/lib/fees-server";
import { geocode, route } from "@/lib/maps";
import { quoteSubscription, blockMin, cancelFeePct, type SubLike, type PassengerType } from "@/lib/pricing";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { addDays, vilniusToday, vilniusToDate, toMin, fmtTime } from "@/lib/time";
import { generateTrips } from "@/lib/trips";
import { CONSENTS, TERMS_VERSION, isRequired } from "@/lib/terms";
import { loadConsents, clientHasKids } from "@/lib/consents";
import { notifyOwner, notifyGuardians, notifyProfiles, whenLt } from "@/lib/push";
import { DAYS } from "@/lib/time";

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/prisijungti");
}

/* ---------- Bendros pagalbinės ---------- */

async function existingSubs(): Promise<SubLike[]> {
  const { data } = await supabaseAdmin().from("subscriptions")
    .select("id, weekdays, period, pickup_time, extra_kids, drive_min, status, passenger_type").in("status", ["active", "pending"]);
  const s = await loadSettings();
  return (data ?? []).map((x) => ({ ...x, pickup_time: String(x.pickup_time).slice(0, 5), block_min: blockMin(s, x.drive_min, x.passenger_type) }));
}


async function assertGuardian(childId: string, profileId: string) {
  const { data } = await supabaseAdmin().from("child_guardians").select("child_id").eq("child_id", childId).eq("profile_id", profileId).maybeSingle();
  if (!data) throw new Error("Neturite teisės užsakyti šiam keleiviui.");
}

type SubInput = { child_id: string; from_place_id: string; to_place_id: string; weekdays: number[]; period: "am" | "pm"; pickup_time: string; extra_kids: number; months: number };

async function computeQuote(me: string, input: SubInput) {
  await assertGuardian(input.child_id, me);
  const db = supabaseAdmin();
  const { data: places } = await db.from("places").select("id, address, lat, lng").in("id", [input.from_place_id, input.to_place_id]);
  const f = places?.find((p) => p.id === input.from_place_id), t = places?.find((p) => p.id === input.to_place_id);
  if (!f || !t || f.id === t.id) return { s: DEFAULT_SETTINGS, q: null, r: null, req: null, driver: null, error: "Pasirinkite skirtingas paėmimo ir nuvežimo vietas." };
  const s = await loadSettings();
  const time = input.period === "am" ? s.morning_start : input.pickup_time;
  const dep = vilniusToDate(addDays(vilniusToday(), 7), time);
  const r = await route(f.lat != null ? f : null, t.lat != null ? t : null, dep);
  const { data: pax } = await db.from("children").select("passenger_type").eq("id", input.child_id).single();
  const req = { ...input, pickup_time: time, km: r.km, driveMin: r.min, passenger: (pax?.passenger_type ?? "child") as PassengerType };
  // Kaina skaičiuojama pagal laisviausią tinkamą vairuotoją
  const best = await bestDriverQuote(s, req);
  if (best) return { s, q: best.q, r, req, driver: best.driver as string | null, error: null };
  // Nėra laisvo vairuotojo: kaina pagal visą parką, galimas tik pasiūlymas
  const subs = await existingSubs();
  const q = quoteSubscription(s, subs, req);
  if (q.ok) q.full = true;
  return { s, q, r, req, driver: null as string | null, error: q.ok ? null : q.reason ?? "Negalima užsakyti." };
}

/* ---------- Klientas (tėvai) ---------- */

export async function quoteAction(input: SubInput) {
  const me = await requireProfile();
  const { q, error } = await computeQuote(me.id, input);
  if (!q || error) return { ok: false as const, error };
  // Klientui grąžinama tik galutinė kaina, be kainodaros detalių
  const s = await loadSettings(), platformFee = (await familyAlreadyPays(input.child_id)) ? 0 : s.platform_fee;
  return { ok: true as const, full: q.full, perTrip: q.perTrip, monthly: q.monthly, tripsPerMonth: q.tripsPerMonth, kids: q.kids, platformFee };
}

export async function createSubscription(input: SubInput, bidMonthly?: number) {
  const me = await requireProfile();
  const { s, q, r, req, driver, error } = await computeQuote(me.id, input);
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
    per_trip_eur: perTrip, monthly_eur: monthly, is_bid: isBid, status: "pending", driver_id: driver, passenger_type: req?.passenger ?? "child",
  });
  if (e) return { ok: false as const, error: "Nepavyko išsaugoti. Bandykite dar kartą." };
  const when = `${input.weekdays.map((w) => DAYS[w - 1]).join(", ")} ${input.period === "am" ? "rytas" : input.pickup_time}`;
  await notifyOwner(isBid ? "Naujas kainos pasiūlymas" : "Naujas abonementas", `${me.full_name || me.email}: ${when}, ${monthly} €/mėn. Laukia patvirtinimo.`, "/savininkas/uzsakymai");
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
  const { data: t } = await db.from("trips").select("id, child_id, pickup_at, status, driver_id").eq("id", id).single();
  if (!t || t.status !== "scheduled") return;
  const staff = me.role === "owner" || (me.role === "driver" && t.driver_id === me.id);
  if (!staff) await assertGuardian(t.child_id, me.id);
  const s = await loadSettings();
  const hours = (new Date(t.pickup_at).getTime() - Date.now()) / 36e5;
  const fee = staff ? 0 : cancelFeePct(s, hours);
  await db.from("trips").update({ status: "cancelled", cancel_fee_pct: fee }).eq("id", id);
  const when = whenLt(t.pickup_at);
  if (!staff) {
    await notifyOwner("Kelionė atšaukta", `${me.full_name || me.email} atšaukė kelionę ${when}${fee ? ` (mokestis ${fee}%)` : ""}.`, "/savininkas");
    await notifyProfiles([t.driver_id], "Kelionė atšaukta", `${me.full_name || me.email} atšaukė kelionę ${when}.`, "/vairuotojas");
  } else {
    if (me.role === "driver") await notifyOwner("Vairuotojas atšaukė kelionę", `${me.full_name}: ${when}.`, "/savininkas");
    await notifyGuardians(t.child_id, "Kelionė atšaukta", `Vežėjas atšaukė kelionę ${when}. Mokestis už ją netaikomas.`);
  }
  revalidatePath("/tevai"); revalidatePath("/savininkas"); revalidatePath("/vairuotojas");
}

/* ---------- Savininkas ---------- */

// Vairuotojas gali keisti tik savo keliones
async function assertTripAccess(me: Profile, tripId: string) {
  if (me.role === "owner") return;
  const { data } = await supabaseAdmin().from("trips").select("driver_id").eq("id", tripId).single();
  if (!data || data.driver_id !== me.id) throw new Error("Ši kelionė jums nepriskirta.");
}

export async function decideSubscription(fd: FormData) {
  await requireOwner();
  const id = String(fd.get("id")), decision = String(fd.get("decision"));
  const db = supabaseAdmin();
  const { data: sub } = await db.from("subscriptions").select("child_id, pickup_time, monthly_eur, is_bid, driver_id, weekdays, child:children(first_name)").eq("id", id).single();
  if (!sub) return;
  const name = (sub.child as unknown as { first_name: string } | null)?.first_name ?? "keleivio";
  if (decision === "active") {
    const time = String(fd.get("pickup_time") ?? "");
    const driverId = String(fd.get("driver_id") ?? "") || sub.driver_id;
    if (!driverId) throw new Error("Pasirinkite vairuotoją.");
    const patch: Record<string, unknown> = { status: "active", starts_on: vilniusToday(), owner_note: null, driver_id: driverId };
    if (time) patch.pickup_time = time;
    await db.from("subscriptions").update(patch).eq("id", id);
    await generateTrips(id);
    const moved = time && time !== String(sub.pickup_time).slice(0, 5) ? ` Laikas pakeistas į ${time}.` : "";
    await notifyGuardians(sub.child_id, sub.is_bid ? "Jūsų pasiūlymas laimėjo" : "Užsakymas patvirtintas",
      `${name} abonementas patvirtintas, ${sub.monthly_eur} €/mėn.${moved}`);
    await notifyProfiles([driverId], "Naujas abonementas", `${name}: ${sub.weekdays.map((w: number) => DAYS[w - 1]).join(", ")} ${time || String(sub.pickup_time).slice(0, 5)}.`, "/vairuotojas");
  } else if (decision === "ended") {
    await db.from("subscriptions").update({ status: "ended", ends_on: vilniusToday() }).eq("id", id);
    await db.from("trips").update({ status: "cancelled" }).eq("subscription_id", id).eq("status", "scheduled").gt("pickup_at", new Date().toISOString());
    await notifyGuardians(sub.child_id, "Abonementas baigtas", `${name} abonementas baigtas. Būsimos kelionės atšauktos.`);
    await notifyProfiles([sub.driver_id], "Sutartis baigta", `${name} abonementas baigtas.`, "/vairuotojas");
  } else {
    await db.from("subscriptions").update({ status: "rejected" }).eq("id", id);
    await notifyGuardians(sub.child_id, sub.is_bid ? "Pasiūlymas nelaimėjo" : "Užsakymas atmestas",
      sub.is_bid ? `${name} pasiūlymas šį kartą nelaimėjo. Galite pasiūlyti kitą laiką.` : `${name} užsakymo šiuo laiku priimti negalime. Pasirinkite kitą laiką.`);
  }
  revalidatePath("/savininkas", "layout"); revalidatePath("/vairuotojas", "layout");
}

const STATUS_MSG: Record<string, [string, string]> = {
  picked_up: ["Keleivis paimtas", "paimtas ir vežamas"],
  delivered: ["Keleivis nuvežtas", "saugiai nuvežtas"],
  no_show: ["Keleivis neatvyko", "nebuvo paėmimo vietoje"],
};

export async function setTripStatus(fd: FormData) {
  const me = await requireStaff();
  const id = String(fd.get("id")), status = String(fd.get("status"));
  if (!STATUS_MSG[status]) return;
  await assertTripAccess(me, id);
  const db = supabaseAdmin();
  const { data: t } = await db.from("trips").update({ status }).eq("id", id).select("child_id, pickup_at, to_label, child:children(first_name)").single();
  if (t) {
    const name = (t.child as unknown as { first_name: string } | null)?.first_name ?? "Keleivis";
    const [title, verb] = STATUS_MSG[status];
    await notifyGuardians(t.child_id, title, `${name} ${verb}${status === "delivered" ? ` (${t.to_label})` : ""}, ${fmtTime(new Date().toISOString())}.`);
  }
  revalidatePath("/savininkas"); revalidatePath("/vairuotojas");
}

// Savininkas perkelia vieną kelionę į kitą laiką
export async function moveTrip(fd: FormData) {
  const me = await requireStaff();
  const id = String(fd.get("id")), at = String(fd.get("pickup_at") ?? "");
  await assertTripAccess(me, id);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)) return;
  const db = supabaseAdmin();
  const { data: old } = await db.from("trips").select("child_id, pickup_at, status").eq("id", id).single();
  if (!old || old.status !== "scheduled") return;
  const next = vilniusToDate(at.slice(0, 10), at.slice(11, 16));
  await db.from("trips").update({ pickup_at: next.toISOString() }).eq("id", id);
  await notifyGuardians(old.child_id, "Kelionė perkelta", `Kelionė ${whenLt(old.pickup_at)} perkelta į ${whenLt(next.toISOString())}.`);
  revalidatePath("/savininkas"); revalidatePath("/tevai"); revalidatePath("/vairuotojas");
}

// MB priskiria vieną kelionę kitam vairuotojui
export async function assignTrip(fd: FormData) {
  await requireOwner();
  const id = String(fd.get("id")), driverId = String(fd.get("driver_id") ?? "");
  if (!driverId) return;
  const db0 = supabaseAdmin();
  const [{ data: tr }, { data: dr }] = await Promise.all([
    db0.from("trips").select("child:children(passenger_type)").eq("id", id).single(),
    db0.from("drivers").select("child_qr_verified, child_seats").eq("profile_id", driverId).single(),
  ]);
  const pt = (tr?.child as unknown as { passenger_type?: PassengerType } | null)?.passenger_type ?? "child";
  if (pt === "child" && !(dr && childOk(dr))) throw new Error("Šis vairuotojas neturi patikrinto neteistumo QR kodo ar vaikiškų kėdučių.");
  const { data: t } = await supabaseAdmin().from("trips").update({ driver_id: driverId }).eq("id", id).select("pickup_at, to_label").single();
  if (t) await notifyProfiles([driverId], "Jums priskirta kelionė", `${whenLt(t.pickup_at)} į ${t.to_label}.`, "/vairuotojas");
  revalidatePath("/savininkas"); revalidatePath("/vairuotojas");
}

/* ---------- Vairuotojai (valdo MB) ---------- */

export async function inviteDriver(fd: FormData) {
  await requireOwner();
  const email = String(fd.get("email") ?? "").trim().toLowerCase(), full_name = String(fd.get("full_name") ?? "").trim();
  const cert_no = String(fd.get("cert_no") ?? "").trim();
  if (!email || !cert_no) throw new Error("Įveskite el. paštą ir individualios veiklos pažymos numerį.");
  const db = supabaseAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${site}/auth/callback`, data: { full_name } });
  if (error || !data.user) throw new Error("Nepavyko pakviesti: " + (error?.message ?? ""));
  await db.from("profiles").upsert({ id: data.user.id, email, full_name, phone: String(fd.get("phone") ?? "") || null, role: "driver" });
  await db.from("drivers").insert({ profile_id: data.user.id, cert_no, car: String(fd.get("car") ?? "") || null, seats: String(fd.get("seats") ?? "") || null });
  const docs = [["Individualios veiklos pažyma", cert_no, null], ["Vairuotojo pažymėjimas (B)", null, fd.get("license_until")], ["Automobilio draudimas (TPVCA)", null, fd.get("insurance_until")], ["Pažyma apie teistumą", null, fd.get("record_until")]]
    .map(([name, number, until]) => ({ driver_id: data.user!.id, name: String(name), number: number ? String(number) : null, valid_until: until ? String(until) : null }));
  await db.from("driver_documents").insert(docs);
  revalidatePath("/savininkas/vairuotojai");
}

export async function updateDriver(fd: FormData) {
  await requireOwner();
  const id = String(fd.get("id"));
  const patch: Record<string, unknown> = {};
  if (fd.has("payout_pct")) { const v = String(fd.get("payout_pct")).trim(); patch.payout_pct = v === "" ? null : Math.min(100, Math.max(0, parseFloat(v.replace(",", ".")))); }
  if (fd.has("active")) patch.active = fd.get("active") === "1";
  if (fd.has("child_flags")) { patch.child_qr_verified = fd.get("child_qr_verified") === "on"; patch.child_seats = fd.get("child_seats") === "on"; }
  await supabaseAdmin().from("drivers").update(patch).eq("profile_id", id);
  revalidatePath("/savininkas", "layout");
}

export async function saveDriverDoc(fd: FormData) {
  const me = await requireStaff();
  const driverId = me.role === "owner" ? String(fd.get("driver_id")) : me.id;
  const id = String(fd.get("doc_id") ?? ""), valid_until = String(fd.get("valid_until") ?? "") || null;
  const db = supabaseAdmin();
  if (id) await db.from("driver_documents").update({ valid_until, number: String(fd.get("number") ?? "") || null }).eq("id", id).eq("driver_id", driverId);
  else await db.from("driver_documents").insert({ driver_id: driverId, name: String(fd.get("name") ?? "Dokumentas"), number: String(fd.get("number") ?? "") || null, valid_until });
  if (me.role === "driver") await notifyOwner("Atnaujintas dokumentas", `${me.full_name} atnaujino dokumentą.`, "/savininkas/vairuotojai");
  revalidatePath("/savininkas/vairuotojai"); revalidatePath("/vairuotojas/duomenys");
}

// Vairuotojas pažymi, kuriomis dienomis dirba
export async function saveWorkdays(fd: FormData) {
  const me = await requireDriver();
  const days = fd.getAll("workdays").map(Number).filter((w) => w >= 1 && w <= 7);
  await supabaseAdmin().from("drivers").update({ workdays: days }).eq("profile_id", me.id);
  revalidatePath("/vairuotojas/duomenys");
}

// Savininkas praneša klientui, kad mėnesio sąskaita paruošta
export async function notifyInvoice(fd: FormData) {
  await requireOwner();
  const id = String(fd.get("id")), amount = String(fd.get("amount") ?? "");
  await notifyProfiles([id], "Sąskaita paruošta", `Šio mėnesio sąskaita paruošta: ${amount}. Ją rasite el. pašte.`);
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
  const pt = String(fd.get("passenger_type") ?? "child") as PassengerType;
  if (!["child", "adult", "senior"].includes(pt)) throw new Error("Neteisingas keleivio tipas.");
  const { data: c } = await db.from("children").insert({
    first_name: String(fd.get("first_name")), birth_year: Number(fd.get("birth_year")) || null, passenger_type: pt,
    seat: pt === "child" ? String(fd.get("seat") ?? "Kėdutė") : null, notes: String(fd.get("notes") ?? "") || null,
  }).select("id").single();
  const guardians = fd.getAll("guardians").map(String).filter(Boolean);
  if (c && guardians.length) await db.from("child_guardians").insert(guardians.map((g) => ({ child_id: c.id, profile_id: g })));
  revalidatePath("/savininkas/klientai");
}

// Klientas pats prideda suaugusį keleivį: save arba kitą žmogų (pvz., tėvus). Vaikus įrašo MB.
// Suaugusiųjų sveikatos ar judumo duomenys nerenkami.
export async function addPassenger(fd: FormData) {
  const me = await requireProfile();
  const self = fd.get("who") === "self", name = String(fd.get("first_name") ?? "").trim();
  if (!name) throw new Error("Įrašykite vardą.");
  if (!self && fd.get("consent") !== "on") throw new Error("Patvirtinkite, kad keleivis sutinka būti vežamas.");
  const dropoff = !self && fd.get("dropoff") === "handover" ? "handover" : "alone";
  const db = supabaseAdmin();
  const { data: c } = await db.from("children").insert({
    first_name: name, passenger_type: fd.get("senior") === "on" ? "senior" : "adult", is_self: self, dropoff,
    handover_to: dropoff === "handover" ? String(fd.get("handover_to") ?? "").trim() || null : null,
    consent_at: self ? null : new Date().toISOString(), notes: String(fd.get("notes") ?? "").trim() || null, seat: null,
  }).select("id").single();
  if (c) await db.from("child_guardians").insert({ child_id: c.id, profile_id: me.id });
  revalidatePath("/tevai", "layout");
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

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
  const me = await requireProfile();
  await supabaseAdmin().from("push_subscriptions").upsert({ profile_id: me.id, ...sub }, { onConflict: "endpoint" });
}

// Klientas keičia abonemento laiką: grąžinama savininkui patvirtinti
export async function requestSubscriptionChange(fd: FormData) {
  const me = await requireProfile();
  const id = String(fd.get("id")), time = String(fd.get("pickup_time") ?? "");
  const db = supabaseAdmin();
  const { data: sub } = await db.from("subscriptions").select("id, child_id, period, pickup_time, status").eq("id", id).single();
  if (!sub || sub.period !== "pm" || !/^\d{2}:\d{2}$/.test(time)) return;
  await assertGuardian(sub.child_id, me.id);
  const note = `Prašoma pakeisti laiką iš ${String(sub.pickup_time).slice(0, 5)} į ${time}`;
  await db.from("subscriptions").update({ owner_note: note }).eq("id", id);
  await notifyOwner("Prašoma pakeisti užsakymą", `${me.full_name || me.email}: ${note}.`, "/savininkas/uzsakymai");
  revalidatePath("/tevai");
}

// Klientas pažymi sutikimus. Įrašomi tik pasikeitę punktai, su laiku ir sąlygų versija.
export async function saveConsents(fd: FormData) {
  const me = await requireProfile();
  const cur = await loadConsents(me.id);
  const rows = CONSENTS.map((c) => ({ c, granted: fd.get(c.key) === "on" })), kids = await clientHasKids(me.id);
  if (rows.some(({ c, granted }) => isRequired(c, kids) && !granted)) throw new Error("Pažymėkite visus privalomus punktus.");
  const changed = rows.filter(({ c, granted }) => cur[c.key]?.granted !== granted || cur[c.key]?.version !== TERMS_VERSION)
    .map(({ c, granted }) => ({ profile_id: me.id, key: c.key, granted, terms_version: TERMS_VERSION }));
  if (changed.length) await supabaseAdmin().from("consents").insert(changed);
  revalidatePath("/tevai", "layout");
  if (fd.get("next") === "tevai") redirect("/tevai");
}

/* ---------- Liga, remontas ir pakaitos ---------- */

// Vairuotojas (ar MB jo vardu) praneša apie ligą ar automobilio remontą
export async function reportAbsence(fd: FormData) {
  const me = await requireStaff();
  const driverId = me.role === "owner" ? String(fd.get("driver_id")) : me.id;
  const reason = String(fd.get("reason")), starts_on = String(fd.get("starts_on")), ends_on = String(fd.get("ends_on"));
  if (!["sick", "repair", "other"].includes(reason) || !/^\d{4}-\d{2}-\d{2}$/.test(starts_on) || !/^\d{4}-\d{2}-\d{2}$/.test(ends_on) || ends_on < starts_on) throw new Error("Patikrinkite priežastį ir datas.");
  await supabaseAdmin().from("driver_absences").insert({ driver_id: driverId, reason, starts_on, ends_on, note: String(fd.get("note") ?? "") || null });
  const drivers = await loadDrivers();
  const n = (await affectedTrips(drivers)).filter((t) => t.driver_id === driverId).length;
  const name = drivers.find((d) => d.profile_id === driverId)?.profile.full_name ?? "Vairuotojas";
  await notifyOwner(`${ABSENCE_LT[reason as "sick"]}: ${name}`, `${starts_on} – ${ends_on}. Kelionių be vairuotojo: ${n}.`, "/savininkas/pakaitos");
  revalidatePath("/savininkas", "layout"); revalidatePath("/vairuotojas", "layout");
}

export async function deleteAbsence(fd: FormData) {
  const me = await requireStaff();
  let q = supabaseAdmin().from("driver_absences").delete().eq("id", String(fd.get("id")));
  if (me.role === "driver") q = q.eq("driver_id", me.id);
  await q;
  revalidatePath("/savininkas", "layout"); revalidatePath("/vairuotojas", "layout");
}

// MB siunčia pasiūlymą konkrečiam laisvam vairuotojui (arba pirmam laisvam)
export async function offerTrip(fd: FormData) {
  await requireOwner();
  await offerNext(String(fd.get("trip_id")), String(fd.get("driver_id") ?? "") || undefined);
  revalidatePath("/savininkas/pakaitos");
}

export async function offerAllAffected() {
  await requireOwner();
  for (const t of await affectedTrips(await loadDrivers())) await offerNext(t.id);
  revalidatePath("/savininkas/pakaitos");
}

// Pakaitinis vairuotojas atsako į pasiūlymą
export async function respondOffer(fd: FormData) {
  const me = await requireDriver();
  const id = String(fd.get("id")), accept = fd.get("answer") === "yes";
  const db = supabaseAdmin();
  const { data: o } = await db.from("trip_offers").select("id, trip_id, status, expires_at, trip:trips(pickup_at, to_label, child_id, child:children(first_name))").eq("id", id).eq("driver_id", me.id).single();
  if (!o || o.status !== "pending" || new Date(o.expires_at) < new Date()) { revalidatePath("/vairuotojas"); return; }
  const trip = o.trip as unknown as { pickup_at: string; to_label: string; child_id: string; child: { first_name: string } };
  await db.from("trip_offers").update({ status: accept ? "accepted" : "declined", answered_at: new Date().toISOString() }).eq("id", id);
  if (accept) {
    await db.from("trips").update({ driver_id: me.id, status_note: `Kelionę atliks kitas vairuotojas: ${me.full_name}` }).eq("id", o.trip_id);
    await notifyGuardians(trip.child_id, "Pasikeitė vairuotojas", `${trip.child.first_name} kelionę ${whenLt(trip.pickup_at)} atliks ${me.full_name}.`);
    await notifyOwner("Pakaita priimta", `${me.full_name} perėmė kelionę ${whenLt(trip.pickup_at)}.`, "/savininkas/pakaitos");
  } else {
    await offerNext(o.trip_id);
  }
  revalidatePath("/vairuotojas"); revalidatePath("/savininkas", "layout");
}

// Pakaitos nėra: kelionė atšaukiama dėl teikėjo, be mokesčio, kaina įskaitoma į kliento sąskaitą
export async function cancelForProvider(fd: FormData) {
  await requireOwner();
  const id = String(fd.get("id"));
  const db = supabaseAdmin();
  const { data: t } = await db.from("trips").select("id, child_id, pickup_at, price_eur, status, driver_id, child:children(first_name)").eq("id", id).single();
  if (!t || t.status !== "scheduled") return;
  const a = absenceOn((await loadDrivers()).find((d) => d.profile_id === t.driver_id), t.pickup_at);
  const why = a ? ABSENCE_LT[a.reason].toLowerCase() : "vairuotojas negali vežti";
  await db.from("trips").update({ status: "cancelled", cancel_fee_pct: 0, credit_eur: t.price_eur, status_note: `Atšaukta dėl vairuotojo (${why}). Mokestis netaikomas, kaina įskaitoma į sąskaitą.` }).eq("id", id);
  await db.from("trip_offers").update({ status: "withdrawn" }).eq("trip_id", id).eq("status", "pending");
  const name = (t.child as unknown as { first_name: string } | null)?.first_name ?? "Keleivio";
  await notifyGuardians(t.child_id, "Kelionė atšaukta", `${name} kelionė ${whenLt(t.pickup_at)} atšaukta, nes vairuotojas negali vežti (${why}). Mokestis netaikomas, ${eurLt(t.price_eur)} įskaitysime į sąskaitą.`);
  revalidatePath("/savininkas", "layout"); revalidatePath("/tevai");
}
const eurLt = (v: number) => `${Number(v).toFixed(2).replace(".", ",")} €`;

/* ---------- Pirmas ekranas: skaičiuoklė ir pažintinis pokalbis ---------- */

// Viešai prieinama: grąžinami tik galutiniai skaičiai, ne kainodaros formulė
export async function calcAction(i: { km: number; perWeek: number; passenger: PassengerType; hourValue: number }) {
  const passenger: PassengerType = ["child", "adult", "senior"].includes(i.passenger) ? i.passenger : "child";
  return quickCalc(await loadSettings(), { km: Number(i.km) || 1, perWeek: Number(i.perWeek) || 1, passenger, hourValue: Number(i.hourValue) || 0 });
}

// Pokalbio užklausą gali pateikti ir neprisijungęs lankytojas (atėjęs iš įstaigos)
export async function requestVisit(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  if (String(fd.get("website") ?? "")) return { ok: true }; // apsauga nuo robotų
  const me = await currentProfile();
  const str = (k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
  const name = me?.full_name || str("name", 80), phone = str("phone", 30) || me?.phone || "";
  const who = str("who"), how = str("how"), date = str("date"), time = str("time");
  if (!name || (!me && !/^\+?[\d\s()-]{7,}$/.test(phone))) return { ok: false, error: "Įrašykite vardą ir telefono numerį." };
  if (!(who in VISIT_WHO) || !(how in VISIT_HOW) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= vilniusToday() || !/^\d{2}:\d{2}$/.test(time)) return { ok: false, error: "Patikrinkite pokalbio būdą, datą ir laiką." };
  const driverId = str("driver_id") || null;
  const { error } = await supabaseAdmin().from("visit_requests").insert({ profile_id: me?.id ?? null, name, phone: phone || null, who, how, org: str("org", 120) || null, wanted_date: date, wanted_time: time, driver_id: driverId, note: str("note", 500) || null });
  if (error) return { ok: false, error: "Nepavyko išsiųsti. Bandykite dar kartą arba paskambinkite mums." };
  await notifyOwner("Nauja pokalbio užklausa", `${name}, ${date} ${time}: ${VISIT_HOW[how as keyof typeof VISIT_HOW]}.`, "/savininkas/pokalbiai");
  if (me) revalidatePath("/tevai/pradzia");
  return { ok: true };
}

export async function setVisitStatus(fd: FormData) {
  await requireOwner();
  const id = String(fd.get("id")), status = String(fd.get("status")), driverId = String(fd.get("driver_id") ?? "") || null;
  if (!["confirmed", "done", "declined"].includes(status)) return;
  const { data: v } = await supabaseAdmin().from("visit_requests").update({ status, driver_id: driverId }).eq("id", id).select("profile_id, wanted_date, wanted_time, name").single();
  if (v && status === "confirmed") {
    if (driverId) await notifyProfiles([driverId], "Pažintinis pokalbis", `${v.name}, ${v.wanted_date} ${String(v.wanted_time).slice(0, 5)}.`, "/vairuotojas");
    if (v.profile_id) await notifyProfiles([v.profile_id], "Pokalbis patvirtintas", `${v.wanted_date} ${String(v.wanted_time).slice(0, 5)}. Iki pasimatymo!`, "/tevai/pradzia");
  }
  revalidatePath("/savininkas/pokalbiai"); revalidatePath("/vairuotojas");
}

// Vairuotojas pats aprašo save klientams
export async function saveDriverProfile(fd: FormData) {
  const me = await requireDriver();
  const y = Number(fd.get("since_year")) || null;
  await supabaseAdmin().from("drivers").update({ bio: String(fd.get("bio") ?? "").trim().slice(0, 400) || null, since_year: y && y >= 1950 && y <= new Date().getFullYear() ? y : null }).eq("profile_id", me.id);
  revalidatePath("/vairuotojas/duomenys");
}
