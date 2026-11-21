"use client";
import { useEffect, useRef, useState } from "react";
import { sendLocation } from "@/app/actions";

type WakeLock = { release: () => Promise<void> };

// Vairuotojas kelionės metu dalijasi vieta: siunčiama ne dažniau kaip kas 8 s, ekranas laikomas įjungtas.
export function DriverLocation({ tripId }: { tripId: string }) {
  const key = `ridu-live-${tripId}`;
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState("");
  const last = useRef(0), watch = useRef<number | null>(null), lock = useRef<WakeLock | null>(null);

  useEffect(() => { try { if (sessionStorage.getItem(key) === "1") setOn(true); } catch { /* nėra saugyklos */ } }, [key]);

  useEffect(() => {
    if (!on) return;
    if (!("geolocation" in navigator)) { setMsg("Šis įrenginys nepalaiko vietos nustatymo."); setOn(false); return; }
    try { sessionStorage.setItem(key, "1"); } catch { /* nėra saugyklos */ }
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };
    nav.wakeLock?.request("screen").then((l) => { lock.current = l; }).catch(() => {});
    setMsg("Ieškoma vietos…");
    watch.current = navigator.geolocation.watchPosition(async (p) => {
      const now = Date.now();
      if (now - last.current < 8000) return;
      last.current = now;
      const r = await sendLocation({ tripId, lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, heading: p.coords.heading, speed: p.coords.speed }).catch(() => null);
      if (r && "stop" in r && r.stop) { setOn(false); setMsg("Kelionė baigta, vieta nebesiunčiama."); return; }
      setMsg(r?.ok ? `Vieta rodoma artimiesiems · ${new Date().toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Nepavyko išsiųsti, bandoma vėl…");
    }, (e) => {
      setMsg(e.code === 1 ? "Leiskite programėlei naudoti vietą (Nustatymai → Ridu → Vieta)." : "Vietos nustatyti nepavyko, bandoma vėl…");
      if (e.code === 1) setOn(false);
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    return () => {
      if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
      lock.current?.release().catch(() => {}); lock.current = null;
    };
  }, [on, tripId, key]);

  const stop = () => { setOn(false); setMsg("Vieta nebesiunčiama."); try { sessionStorage.removeItem(key); } catch { /* nėra saugyklos */ } };
  return (
    <div className="grid gap-2">
      {on ? <button type="button" onClick={stop} className="btn">⏸ Sustabdyti vietos rodymą</button>
        : <button type="button" onClick={() => setOn(true)} className="btn btn-primary btn-lg">📍 Rodyti mano vietą artimiesiems</button>}
      {msg && <p className="text-sm muted" role="status">{msg}</p>}
      <p className="text-xs muted">Kelionės metu laikykite programėlę atidarytą. Vieta rodoma tik šios kelionės metu ir ištrinama ją baigus.</p>
    </div>
  );
}
