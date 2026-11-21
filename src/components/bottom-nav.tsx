"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICON: Record<string, React.ReactNode> = {
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  cal: <><rect x="4" y="5" width="16" height="15" rx="3" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
};

// Klientų apatinė navigacija: Pagrindinis, Kelionės, Pranešimai, Profilis
export function BottomNav({ items }: { items: { href: string; label: string; icon: string; match?: string[] }[] }) {
  const path = usePathname();
  // Tiksliausias atitikmuo laimi: „Profilis“ (/tevai/) apima visus kitus /tevai/… puslapius
  const score = (h: string) => h === "/tevai" ? (path === h ? 100 : 0) : h === "/tevai/" ? (path.startsWith(h) ? 1 : 0) : path === h || path.startsWith(h + "/") ? h.length : 0;
  const sc = (i: (typeof items)[number]) => Math.max(...[i.href, ...(i.match ?? [])].map(score));
  const best = Math.max(...items.map(sc));
  const active = (i: (typeof items)[number]) => best > 0 && sc(i) === best;
  return (
    <nav className="bottom-nav" aria-label="Pagrindinė navigacija">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {items.map((i) => (
          <Link key={i.href} href={i.href} aria-current={active(i) ? "page" : undefined}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active(i) ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[i.icon]}</svg>
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
