import { Ico } from "@/components/ico";
import { fmtTime } from "@/lib/time";

type T = { status: string; pickup_at: string; picked_up_at?: string | null; delivered_at?: string | null; from_label: string; to_label: string };

// Kelionės eiga aiškiais žingsniais: laukia, kelyje, nuvežtas
export function TripSteps({ t }: { t: T }) {
  const at = t.status === "delivered" ? 2 : t.status === "picked_up" ? 1 : 0;
  const steps: [string, string | null][] = [
    [at === 0 ? `Paėmimas ${fmtTime(t.pickup_at)}` : "Paimtas", at > 0 ? (t.picked_up_at ? fmtTime(t.picked_up_at) : null) : t.from_label],
    ["Kelyje", at === 1 ? `į ${t.to_label}` : null],
    ["Nuvežtas", at === 2 ? `${t.to_label}${t.delivered_at ? ` · ${fmtTime(t.delivered_at)}` : ""}` : t.to_label],
  ];
  return (
    <ol className="grid gap-0" aria-label="Kelionės eiga">
      {steps.map(([label, sub], i) => {
        const done = i < at || (i === 2 && at === 2), now = i === at && at < 2;
        return (
          <li key={label} className="grid grid-cols-[28px_1fr] gap-3">
            <div className="grid justify-items-center">
              <span aria-hidden="true" className={`mt-1 grid h-6 w-6 place-items-center rounded-full border-[3px] text-xs font-bold ${done ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-fg)]" : now ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]" : "border-[var(--line)] bg-[var(--surface)]"}`}>{done ? <Ico n="check" size={14} stroke={3} /> : null}</span>
              {i < 2 && <span aria-hidden="true" className={`w-[3px] flex-1 ${i < at ? "bg-[var(--brand)]" : "bg-[var(--line)]"}`} style={{ minHeight: 18 }} />}
            </div>
            <div className="grid pb-3">
              <span className={`text-lg ${now || done ? "font-bold" : "muted"}`}>{label}{now && <span className="sr-only"> (dabar)</span>}</span>
              {sub && <span className="text-sm muted">{sub}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
