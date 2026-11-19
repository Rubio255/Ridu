import Link from "next/link";
import { signOut } from "@/app/actions";

export function Shell({ title, name, tabs, children }: { title: string; name: string; tabs: [string, string][]; children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-[var(--brand)] text-[var(--brand-fg)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--accent)] font-bold text-[var(--accent-fg)]">V</div>
            <div><div className="font-bold leading-tight">{title}</div><div className="text-xs opacity-80">{name}</div></div>
          </div>
          <form action={signOut}><button className="rounded-md border border-current px-2 py-1 text-xs">Atsijungti</button></form>
        </div>
      </header>
      <nav className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {tabs.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-[var(--muted)] hover:text-[var(--fg)]">{label}</Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-5 pb-12">{children}</main>
    </>
  );
}

export const STATUS_LT: Record<string, [string, string]> = {
  scheduled: ["Suplanuota", "p-info"], picked_up: ["Vaikas paimtas", "p-accent"], delivered: ["Nuvežta", "p-ok"],
  cancelled: ["Atšaukta", "p-bad"], no_show: ["Neatvyko", "p-bad"],
  pending: ["Laukia patvirtinimo", "p-warn"], active: ["Galioja", "p-ok"], rejected: ["Atmesta", "p-bad"], ended: ["Baigta", "p-bad"],
};
export function Pill({ s }: { s: string }) {
  const [l, c] = STATUS_LT[s] ?? [s, "p-info"];
  return <span className={`pill ${c}`}>{l}</span>;
}
