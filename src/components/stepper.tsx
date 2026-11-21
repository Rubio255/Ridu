"use client";

// Skaičiaus keitimas mygtukais − / + (patogu telefone, nereikia rinkti klaviatūra)
export function Stepper({ value, onChange, min = 1, max = 9, step = 1, label, unit }: {
  value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; label: string; unit?: (n: number) => string;
}) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(n * 10) / 10)));
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] p-1">
      <button type="button" aria-label={`Mažinti: ${label}`} disabled={value <= min} onClick={() => set(value - step)}
        className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--surface)] text-xl font-bold shadow-sm disabled:opacity-40">−</button>
      <output aria-live="polite" className="num text-center text-lg font-bold">{unit ? unit(value) : value}</output>
      <button type="button" aria-label={`Didinti: ${label}`} disabled={value >= max} onClick={() => set(value + step)}
        className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--accent)] text-xl font-bold text-[var(--accent-fg)] shadow-sm disabled:opacity-40">+</button>
    </div>
  );
}
