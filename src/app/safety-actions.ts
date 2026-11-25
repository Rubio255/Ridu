"use server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/server";
import { requireOwner, requireProfile } from "@/lib/auth";
import { notifyOwner } from "@/lib/push";
import { canReview, validateReview } from "@/lib/reviews";

type TripParty = { id: string; driver_id: string | null; payer_id: string; status: string; delivered_at: string | null };

// Atsiliepimas po kelionės: klientas (mokėtojas) apie vairuotoją arba vairuotojas apie klientą
export async function submitReview(fd: FormData) {
  const me = await requireProfile();
  const v = validateReview({ stars: fd.get("stars"), comment: fd.get("comment") });
  if (!v.ok) return v;
  const db = supabaseAdmin();
  const { data } = await db.from("trips").select("id, driver_id, payer_id, status, delivered_at").eq("id", String(fd.get("trip_id"))).maybeSingle();
  const t = data as TripParty | null;
  if (!t || !canReview(t)) return { ok: false as const, error: "Šios kelionės įvertinti nebegalima." };
  const role = me.id === t.payer_id ? "client" : me.id === t.driver_id ? "driver" : null;
  const target = role === "client" ? t.driver_id : role === "driver" ? t.payer_id : null;
  if (!role || !target) return { ok: false as const, error: "Ši kelionė ne jūsų." };
  const { error } = await db.from("trip_reviews").insert({ trip_id: t.id, author_id: me.id, target_id: target, author_role: role, stars: v.stars, comment: v.comment });
  if (error) return { ok: false as const, error: error.code === "23505" ? "Šią kelionę jau įvertinote." : "Nepavyko išsaugoti." };
  revalidatePath("/tevai"); revalidatePath("/vairuotojas");
  return { ok: true as const };
}

// SOS kelionės metu: pranešimas Ridu administratoriui su vieta. Skambutį 112 telefonas atlieka pats (tel:112).
export async function sendSos(i: { tripId?: string | null; lat?: number | null; lng?: number | null; accuracy?: number | null }) {
  const me = await requireProfile();
  const db = supabaseAdmin();
  let tripId: string | null = null;
  if (i.tripId) {
    const { data: t } = await db.from("trips").select("id, driver_id, payer_id").eq("id", i.tripId).maybeSingle();
    if (t && (t.driver_id === me.id || t.payer_id === me.id)) tripId = t.id;
  }
  const num = (x: unknown, lim: number) => (x == null || !isFinite(Number(x)) || Math.abs(Number(x)) > lim ? null : Number(x));
  const lat = num(i.lat, 90), lng = num(i.lng, 180);
  const { error } = await db.from("sos_events").insert({ trip_id: tripId, user_id: me.id, lat, lng, accuracy: num(i.accuracy, 1e5) });
  if (error) { console.error("sos insert", error.code); return { ok: false as const }; }
  const where = lat != null && lng != null ? `https://maps.google.com/?q=${lat},${lng}` : "vieta nežinoma";
  await notifyOwner("SOS", `${me.full_name || "Naudotojas"} paspaudė SOS. ${where}`, "/savininkas");
  return { ok: true as const };
}

export async function resolveSos(fd: FormData) {
  const me = await requireOwner();
  await supabaseAdmin().from("sos_events").update({ resolved_at: new Date().toISOString(), resolved_by: me.id, hold: fd.get("hold") === "1" }).eq("id", String(fd.get("id")));
  revalidatePath("/savininkas");
}
