"use client";
import { useState, useTransition } from "react";
import { shareTrip } from "@/app/actions";

// „Dalintis kelione“: nuoroda, kurią galima nusiųsti seneliams ar kitam tėvui (be prisijungimo, galioja ribotai)
export function ShareTrip({ tripId, title }: { tripId: string; title: string }) {
  const [msg, setMsg] = useState("");
  const [busy, start] = useTransition();
  const go = () => start(async () => {
    const r = await shareTrip(tripId);
    if (!r.ok) { setMsg(r.error); return; }
    try {
      if (navigator.share) { await navigator.share({ title: "Ridu kelionė", text: title, url: r.url }); setMsg(""); return; }
    } catch { /* naudotojas atšaukė */ return; }
    try { await navigator.clipboard.writeText(r.url); setMsg("Nuoroda nukopijuota. Ji galioja iki kelionės pabaigos."); } catch { setMsg(r.url); }
  });
  return (
    <div className="grid gap-1">
      <button type="button" onClick={go} disabled={busy} className="btn btn-lg shadow-sm">Dalintis kelione</button>
      {msg && <p className="text-sm muted break-all" role="status">{msg}</p>}
    </div>
  );
}
