import "server-only";
import webpush from "web-push";
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

// Siunčia pranešimą visiems savininko įrenginiams. Klaidos netrukdo pagrindiniam veiksmui.
export async function notifyOwner(title: string, body: string, url = "/savininkas") {
  if (!init()) return;
  const db = supabaseAdmin();
  const { data: owners } = await db.from("profiles").select("id").eq("role", "owner");
  const ids = (owners ?? []).map((o) => o.id);
  if (!ids.length) return;
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
