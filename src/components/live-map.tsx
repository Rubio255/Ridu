"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Marker } from "leaflet";

type P = { lat: number; lng: number };
type Live = { live: boolean; status: string; car: (P & { at: string; accuracy: number | null }) | null; from: P | null; to: P | null };

const km = (a: P, b: P) => {
  const r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};
const pin = (emoji: string, bg: string) => `<div style="display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:${bg};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);font-size:20px">${emoji}</div>`;

// Gyvas vairuotojo vietos žemėlapis (OpenStreetMap). src – API adresas, atnaujinama kas 5 s.
export function LiveMap({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null), car = useRef<Marker | null>(null), fitted = useRef(false);
  const [d, setD] = useState<Live | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try { const r = await fetch(src, { cache: "no-store" }); if (r.ok && !stop) setD(await r.json()); } catch { /* bandoma vėl */ }
    };
    load();
    const id = setInterval(load, 5000), t = setInterval(() => tick((x) => x + 1), 1000);
    return () => { stop = true; clearInterval(id); clearInterval(t); };
  }, [src]);

  useEffect(() => {
    if (!d || !box.current) return;
    let off = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (off || !box.current) return;
      if (!map.current) {
        const c = d.car ?? d.from ?? d.to ?? { lat: 54.6872, lng: 25.2797 };
        map.current = L.map(box.current, { zoomControl: false, attributionControl: true }).setView([c.lat, c.lng], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map.current);
        if (d.from) L.marker([d.from.lat, d.from.lng], { icon: L.divIcon({ html: pin("📍", "#ffffff"), className: "", iconSize: [38, 38], iconAnchor: [19, 19] }) }).addTo(map.current);
        if (d.to) L.marker([d.to.lat, d.to.lng], { icon: L.divIcon({ html: pin("🏁", "#ffffff"), className: "", iconSize: [38, 38], iconAnchor: [19, 19] }) }).addTo(map.current);
      }
      if (d.car) {
        if (!car.current) car.current = L.marker([d.car.lat, d.car.lng], { icon: L.divIcon({ html: pin("🚗", "#f2b705"), className: "", iconSize: [38, 38], iconAnchor: [19, 19] }), zIndexOffset: 1000 }).addTo(map.current);
        else car.current.setLatLng([d.car.lat, d.car.lng]);
        if (!fitted.current) {
          const target = d.status === "picked_up" ? d.to : d.from;
          const pts: [number, number][] = [[d.car.lat, d.car.lng], ...(target ? [[target.lat, target.lng] as [number, number]] : [])];
          map.current.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
          fitted.current = true;
        }
      }
    })();
    return () => { off = true; };
  }, [d]);

  useEffect(() => () => { map.current?.remove(); map.current = null; car.current = null; }, []);

  const target = d?.status === "picked_up" ? d.to : d?.from;
  // Apytikslis laikas: tiesus atstumas × 1,4 mieste, vidutinis greitis 25 km/h
  const eta = d?.car && target ? Math.max(1, Math.round((km(d.car, target) * 1.4) / 25 * 60)) : null;
  const ago = d?.car ? Math.round((Date.now() - new Date(d.car.at).getTime()) / 1000) : null;
  const stale = ago != null && ago > 120;

  return (
    <section className="card gap-2 overflow-hidden p-0" aria-label="Vairuotojo vieta žemėlapyje">
      <div ref={box} className="h-64 w-full bg-[var(--surface-2)]" style={{ zIndex: 0 }} />
      <div className="grid gap-0.5 px-4 pb-4 text-sm">
        {!d ? <span className="muted">Įkeliamas žemėlapis…</span>
          : !d.car ? <span className="muted">Vairuotojo vieta atsiras, kai jis pradės kelionę.</span>
          : <>
              <b className="text-base">{stale ? "Vieta neatnaujinama" : eta ? `${d.status === "picked_up" ? "Atvyks" : "Vairuotojas atvyks"} po ~${eta} min.` : "Vairuotojas kelyje"}</b>
              <span className="muted">{stale ? `Paskutinį kartą prieš ${Math.round(ago! / 60)} min. Gali būti silpnas ryšys.` : `Atnaujinta prieš ${ago} s · laikas apytikslis`}</span>
            </>}
      </div>
    </section>
  );
}
