"use client";
import { useEffect, useState } from "react";

type P = { lat: number; lng: number };
const km = (a: P, b: P) => {
  const r = Math.PI / 180, x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r), y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371 * 1.4; // kelias mieste ~1,4 karto ilgesnis nei tiesi linija
};

// Didelis atvykimo laikas antraštėje: „3 min (1,2 km)“. Kol vietos nėra – rodomas paėmimo laikas.
export function LiveEta({ src, fallback }: { src: string; fallback: string }) {
  const [v, setV] = useState<{ min: number; km: number } | null>(null);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const d = await (await fetch(src, { cache: "no-store" })).json();
        const target = d.status === "picked_up" ? d.to : d.from;
        if (!stop) setV(d.car && target ? { km: km(d.car, target), min: Math.max(1, Math.round(km(d.car, target) / 25 * 60)) } : null);
      } catch { /* bandoma vėl */ }
    };
    load();
    const id = setInterval(load, 10000);
    return () => { stop = true; clearInterval(id); };
  }, [src]);
  if (!v) return <b className="text-3xl">{fallback}</b>;
  return <><b className="text-5xl">{v.min} min</b><span className="text-lg opacity-85">({v.km.toLocaleString("lt-LT", { maximumFractionDigits: 1 })} km)</span></>;
}
