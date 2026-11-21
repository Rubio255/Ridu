"use client";
import { useEffect, useState } from "react";
import { savePushSubscription, saveNativePush } from "@/app/actions";
import { isNativeApp } from "@/lib/native";
import { PushNotifications } from "@capacitor/push-notifications";

const b64 = (s: string) => { const p = "=".repeat((4 - (s.length % 4)) % 4); const r = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };

const TEXT = {
  owner: "Gaukite telefono pranešimą su garsu apie kiekvieną naują, pakeistą ar atšauktą užsakymą.",
  driver: "Gaukite telefono pranešimą, kai jums priskiriamas naujas užsakymas, kelionė perkeliama ar atšaukiama.",
  client: "Gaukite telefono pranešimą, kai keleivis paimamas ir nuvežamas, kai užsakymas patvirtinamas, perkeliamas ar atšaukiamas, ir kai paruošta sąskaita.",
};

// Mygtukas įjungti telefono pranešimus (savininkui ir tėvams)
export function EnablePush({ who = "owner" }: { who?: keyof typeof TEXT }) {
  const [state, setState] = useState<"unknown" | "on" | "off" | "unsupported" | "ios-home" | "denied">("unknown");
  useEffect(() => {
    if (isNativeApp()) {
      // Programėlėje: tikri Apple pranešimai. Jei leidimas jau duotas, raktas atnaujinamas tyliai.
      const h = PushNotifications.addListener("registration", (t) => { saveNativePush(t.value); setState("on"); });
      PushNotifications.checkPermissions().then((p) => {
        if (p.receive === "granted") { PushNotifications.register(); setState("on"); }
        else setState(p.receive === "denied" ? "denied" : "off");
      });
      return () => { h.then((x) => x.remove()); };
    }
    const ios = /iPhone|iPad/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState(ios && !standalone ? "ios-home" : "unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.register("/sw.js").then(async (reg) => setState((await reg.pushManager.getSubscription()) ? "on" : "off"));
  }, []);
  async function enable() {
    if (isNativeApp()) {
      const p = await PushNotifications.requestPermissions();
      if (p.receive !== "granted") { setState("denied"); return; }
      await PushNotifications.register();
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState("denied"); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
    const j = sub.toJSON();
    await savePushSubscription({ endpoint: j.endpoint!, p256dh: j.keys!.p256dh, auth: j.keys!.auth });
    setState("on");
  }
  if (state === "on" || state === "unknown" || state === "unsupported") return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--accent)] p-3 text-sm text-[var(--accent-fg)]">
      {state === "off" && <><span>{TEXT[who]}</span><button onClick={enable} className="btn">Įjungti pranešimus</button></>}
      {state === "ios-home" && <span>iPhone: paspauskite „Bendrinti“ ir „Įtraukti į pradžios ekraną“, tada atidarykite aplikaciją iš pradžios ekrano ir įjunkite pranešimus.</span>}
      {state === "denied" && <span>Pranešimai užblokuoti. Įjunkite juos telefono nustatymuose (Nustatymai → Ridu → Pranešimai).</span>}
    </div>
  );
}
