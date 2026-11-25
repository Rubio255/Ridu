"use client";
import { useState, useTransition } from "react";
import { sendSos } from "@/app/safety-actions";
import { Ico } from "@/components/ico";

// SOS kelionės metu: pirmiausia 112, tada pranešimas Ridu su vieta (vieta saugoma 30 d.)
export function SosButton({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, start] = useTransition();
  const alertRidu = () => start(async () => {
    const pos = await new Promise<GeolocationPosition | null>((res) => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 8000 });
    });
    const r = await sendSos({ tripId, lat: pos?.coords.latitude, lng: pos?.coords.longitude, accuracy: pos?.coords.accuracy });
    setMsg(r.ok ? "Ridu gavo pranešimą su jūsų vieta. Susisieksime nedelsdami." : "Nepavyko išsiųsti. Skambinkite 112.");
  });
  if (!open) return (
    <div className="grid gap-1">
      <button type="button" onClick={() => setOpen(true)} className="btn btn-lg flex w-full items-center justify-center gap-2 border-2 border-[var(--bad)] text-[var(--bad)]"><Ico n="alert" size={18} />SOS</button>
      <p className="text-center text-xs muted">Šis mygtukas nepakeičia 112.</p>
    </div>
  );
  return (
    <section className="card grid gap-2 border-2 border-[var(--bad)]" role="alertdialog" aria-labelledby="sos-t">
      <h2 id="sos-t" className="flex items-center gap-2 font-bold text-[var(--bad)]"><Ico n="alert" size={18} />Pagalba</h2>
      <p className="text-sm">Jei gresia pavojus, pirmiausia skambinkite 112.</p>
      <a href="tel:112" className="btn btn-bad btn-lg flex items-center justify-center gap-2"><Ico n="phone" size={18} />Skambinti 112</a>
      <button type="button" disabled={busy} onClick={alertRidu} className="btn btn-lg">{busy ? "Siunčiama…" : "Pranešti Ridu su mano vieta"}</button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm underline">Uždaryti</button>
      {msg && <p role="status" className="text-sm font-semibold">{msg}</p>}
      <p className="text-xs muted">Vieta perduodama tik Ridu komandai ir saugoma 30 d., nebent jos reikia tyrimui.</p>
    </section>
  );
}
