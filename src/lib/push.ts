import "server-only";
import * as webpush from "web-push";
import { supabaseAdmin } from "./supabase/server";

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
  if (!ids.length || !init()) return;
  const db = supabaseAdmin();
  const { data: subs } = await db.from("push_subscriptions").select("*").in("profile_id", ids);
  const payload = JSON.stringify({ title, body, url, tag: `${Date.now()}` });
  await Promise.all((subs ?? []).map(async (s) => {
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
