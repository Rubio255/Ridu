import "server-only";
import * as webpush from "web-push";
import { supabaseAdmin } from "./supabase/server";
import { sendApns } from "./apns";

// Programėlės (iOS) įrenginiai saugomi toje pačioje lentelėje: endpoint = "apns:<raktas>"
export const APNS_PREFIX = "apns:";

let ready = false;
function init() {
  if (ready) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  ready = true;
  return true;
}

async function sendTo(ids: string[], title: string, body: string, url: string) {
  if (!ids.length) return;
  const web = init();
  const db = supabaseAdmin();
  const { data: subs } = await db.from("push_subscriptions").select("*").in("profile_id", ids);
  const payload = JSON.stringify({ title, body, url, tag: `${Date.now()}` });
  await Promise.all((subs ?? []).map(async (s) => {
    if (s.endpoint.startsWith(APNS_PREFIX)) {
      const r = await sendApns(s.endpoint.slice(APNS_PREFIX.length), title, body, url);
      if (r === "gone") await db.from("push_subscriptions").delete().eq("id", s.id);
      return;
    }
    if (!web) return;
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { urgency: "high", TTL: 3600 });
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id); // įrenginys atsisakė
    }
  }));
}

// Visiems savininko įrenginiams. Klaidos netrukdo pagrindiniam veiksmui.
export async function notifyOwner(title: string, body: string, url = "/savininkas") {
  const { data } = await supabaseAdmin().from("profiles").select("id").eq("role", "owner");
  await sendTo((data ?? []).map((o) => o.id), title, body, url);
}

// Vienam ar keliems klientams (pvz. mokėtojui)
export async function notifyProfiles(ids: (string | null | undefined)[], title: string, body: string, url = "/tevai") {
  await sendTo([...new Set(ids.filter(Boolean) as string[])], title, body, url);
}

// Visiems vaiko globėjams (abiem tėvams, jei vaikas susietas su abiem)
export async function notifyGuardians(childId: string, title: string, body: string, url = "/tevai") {
  const { data } = await supabaseAdmin().from("child_guardians").select("profile_id").eq("child_id", childId);
  await notifyProfiles((data ?? []).map((g) => g.profile_id), title, body, url);
}

export const whenLt = (iso: string) => new Date(iso).toLocaleString("lt-LT", { timeZone: "Europe/Vilnius", weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// Pranešimas pagal naudotojo nustatymus (Nustatymai -> Pranešimai). Išjungę tos rūšies pranešimų negauna.
export type NotifyKind = "offers" | "messages" | "agreements" | "trips";
export async function notifyKind(ids: (string | null | undefined)[], kind: NotifyKind, title: string, body: string, url = "/") {
  const list = [...new Set(ids.filter(Boolean) as string[])];
  if (!list.length) return;
  const { data } = await supabaseAdmin().from("profiles").select("id, notify_prefs").in("id", list);
  const on = (data ?? []).filter((p) => (p.notify_prefs as Record<string, boolean> | null)?.[kind] !== false).map((p) => p.id);
  await sendTo(on, title, body, url);
}
