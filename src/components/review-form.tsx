"use client";
import { useState, useTransition } from "react";
import { submitReview } from "@/app/safety-actions";
import { Ico } from "@/components/ico";

// Atsiliepimas po kelionės. Matomas, kai įvertina abu arba po 14 d.
export function ReviewForm({ tripId, who }: { tripId: string; who: string }) {
  const [stars, setStars] = useState(0);
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, start] = useTransition();
  const send = (fd: FormData) => start(async () => {
    if (!stars) { setMsg("Pasirinkite nuo 1 iki 5 žvaigždučių."); return; }
    fd.set("stars", String(stars)); fd.set("trip_id", tripId);
    const r = await submitReview(fd);
    if (r.ok) setDone(true); else setMsg(r.error);
  });
  if (done) return <p className="card text-sm" role="status">Ačiū už atsiliepimą. Jis bus matomas, kai įvertins ir kita pusė arba po 14 d.</p>;
  return (
    <form action={send} className="card grid gap-2">
      <h2 className="font-bold">Įvertinkite: {who}</h2>
      <div className="flex gap-1" role="group" aria-label="Įvertinimas">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" aria-pressed={i <= stars} aria-label={`${i} iš 5`} onClick={() => setStars(i)} className={`p-1 ${i <= stars ? "text-amber-500" : "muted"}`}>
            <Ico n="star" size={30} className={i <= stars ? "fill-current" : ""} />
          </button>
        ))}
      </div>
      <textarea name="comment" maxLength={500} rows={2} placeholder="Kas patiko ar ką pagerinti? (nebūtina)" aria-label="Atsiliepimas" className="rounded-xl border border-[var(--line)] p-3" />
      {msg && <p className="text-sm text-[var(--bad)]" role="alert">{msg}</p>}
      <button disabled={busy} className="btn btn-lg">{busy ? "Siunčiama…" : "Siųsti atsiliepimą"}</button>
      <p className="text-xs muted">Atsiliepimai matomi, kai įvertina abu arba po 14 d.</p>
    </form>
  );
}
