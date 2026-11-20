"use client";
import { useState, useTransition } from "react";
import { requestVisit } from "@/app/actions";
import { VISIT_HOW, VISIT_WHO } from "@/lib/welcome";

// Pažintinio pokalbio užklausa. Neprisijungęs lankytojas palieka vardą ir telefoną.
export function VisitForm({ guest, drivers, minDate }: { guest: boolean; drivers: { id: string; name: string }[]; minDate: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form id="pokalbis" className="card scroll-mt-4" action={(fd) => start(async () => { const r = await requestVisit(fd); setMsg(r.ok ? { ok: true, text: "Ačiū! Užklausa išsiųsta. Patvirtinsime laiką per vieną darbo dieną." } : { ok: false, text: r.error ?? "Nepavyko." }); })}>
      <h2 className="text-xl font-bold">Užsakykite pažintinį pokalbį</h2>
      <p className="text-sm muted">Nemokamai ir be įsipareigojimų. Susipažinsite su vairuotoju ir kartu aptarsite maršrutą.</p>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <label className="grid gap-1 text-sm font-semibold muted">Kaip norite susitikti<select name="how" className="input">{Object.entries(VISIT_HOW).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2">
        {drivers.length > 0 && <label className="grid gap-1 text-sm font-semibold muted">Su kuo<select name="driver_id" className="input">{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
        <label className="grid gap-1 text-sm font-semibold muted">Pavežimas reikalingas<select name="who" className="input">{Object.entries(VISIT_WHO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold muted">Data<input name="date" type="date" required min={minDate} defaultValue={minDate} className="input" /></label>
        <label className="grid gap-1 text-sm font-semibold muted">Laikas<input name="time" type="time" required min="08:00" max="20:00" defaultValue="17:00" className="input" /></label>
        {guest && <>
          <label className="grid gap-1 text-sm font-semibold muted">Vardas<input name="name" required autoComplete="given-name" className="input" /></label>
          <label className="grid gap-1 text-sm font-semibold muted">Telefonas<input name="phone" type="tel" required autoComplete="tel" placeholder="+370" className="input" /></label>
        </>}
      </div>
      {guest && <label className="grid gap-1 text-sm font-semibold muted">Kur apie mus sužinojote (nebūtina)<input name="org" className="input" placeholder="Pvz. darželis, mokykla, poliklinika" /></label>}
      <label className="grid gap-1 text-sm font-semibold muted">Ką norėtumėte aptarti (nebūtina)<input name="note" className="input" placeholder="Pvz. 3 kartus per savaitę į baseiną" /></label>
      <button className="btn btn-primary py-3 text-base" disabled={pending}>{pending ? "Siunčiama…" : "Užsakyti pokalbį"}</button>
      {msg && <p role="status" className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-[var(--ok-bg)] text-[var(--ok)]" : "bg-[var(--bad-bg)] text-[var(--bad)]"}`}>{msg.text}</p>}
    </form>
  );
}
