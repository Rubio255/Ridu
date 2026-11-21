import Link from "next/link";
import { STATUS_LT } from "./shell";
import { fmtTime } from "@/lib/time";

// Bendri klientų programėlės elementai: antraštė su grįžimu, avataras, būsena, automobilio piešinys
export function BackHeader({ href, title, right }: { href: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[44px_1fr_44px] items-center">
      <Link href={href} aria-label="Atgal" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--surface)] text-lg">←</Link>
      <h1 className="text-center text-lg font-bold">{title}</h1>
      <div className="justify-self-end">{right}</div>
    </div>
  );
}

export function Avatar({ text, size = 44 }: { text: string; size?: number }) {
  return <span aria-hidden="true" className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>{text}</span>;
}

export function StatusPill({ s }: { s: string }) {
  const [l, c] = STATUS_LT[s] ?? [s, "p-info"];
  return <span className={`pill ${c}`}>{l}</span>;
}

export function CarArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 90" className={className} aria-hidden="true">
      <path d="M12 64 Q16 40 46 35 L72 19 Q92 11 130 15 L160 33 Q186 38 190 64 Z" fill="#f4f6f5" stroke="#9fb3ae" strokeWidth="2" />
      <path d="M76 23 L94 18 L126 20 L146 33 L72 33 Z" fill="#b9d4ce" />
      <circle cx="52" cy="66" r="13" fill="#13231f" /><circle cx="52" cy="66" r="5" fill="#9fb3ae" />
      <circle cx="152" cy="66" r="13" fill="#13231f" /><circle cx="152" cy="66" r="5" fill="#9fb3ae" />
    </svg>
  );
}

export type TripLite = { id: string; pickup_at: string; status: string; from_label: string; to_label: string; price_eur?: number | null; child: { first_name: string } | null };

// Kelionės eilutė sąraše: laikas, keleivis, maršrutas, būsena. Paspaudus atidaroma kelionė.
export function TripRow({ t, day = false }: { t: TripLite; day?: boolean }) {
  return (
    <Link href={`/tevai/kelione/${t.id}`} className="grid grid-cols-[60px_1fr_auto] items-center gap-3 border-t border-[var(--line)] pt-3 first:border-0 first:pt-0">
      <div className="grid rounded-xl bg-[var(--brand-soft)] px-1 py-2 text-center">
        <span className="num text-base font-bold text-[var(--brand)]">{fmtTime(t.pickup_at)}</span>
        {day && <span className="text-[11px] font-semibold muted">{new Date(t.pickup_at).toLocaleDateString("lt-LT", { timeZone: "Europe/Vilnius", month: "2-digit", day: "2-digit" })}</span>}
      </div>
      <div className="grid min-w-0">
        <b className="truncate">{t.child?.first_name ?? "Keleivis"}</b>
        <span className="truncate text-sm muted">{t.from_label} → {t.to_label}</span>
      </div>
      <StatusPill s={t.status} />
    </Link>
  );
}

export function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="grid justify-items-center gap-1.5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm font-semibold">
      <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--accent-soft)] text-xl">{icon}</span>{label}
    </Link>
  );
}
