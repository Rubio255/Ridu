import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { fmtDay, fmtTime } from "@/lib/time";
import { VISIT_STATUS } from "@/lib/welcome";

type N = { at: string; icon: string; title: string; text: string; href: string };

// Pranešimai: kas įvyko su jūsų kelionėmis, abonementais ir pokalbiais per pastarąsias 2 savaites
export default async function Page() {
  const sb = await supabaseServer();
  const now = Date.now(), since = new Date(now - 14 * 864e5).toISOString(), soon = new Date(now + 864e5).toISOString();
  const [{ data: trips }, { data: subs }, { data: visits }] = await Promise.all([
    sb.from("trips").select("id, pickup_at, status, from_label, to_label, picked_up_at, delivered_at, status_note, child:children(first_name)").gte("pickup_at", since).lte("pickup_at", soon).order("pickup_at", { ascending: false }).limit(60),
    sb.from("subscriptions").select("id, status, created_at, starts_on, owner_note, child:children(first_name)").gte("created_at", new Date(now - 60 * 864e5).toISOString()),
    sb.from("visit_requests").select("id, status, wanted_date, wanted_time, created_at").gte("created_at", new Date(now - 30 * 864e5).toISOString()),
  ]);
  const list: N[] = [];
  for (const t of trips ?? []) {
    const who = (t.child as unknown as { first_name: string } | null)?.first_name ?? "Keleivis", href = `/tevai/kelione/${t.id}`;
    if (t.delivered_at) list.push({ at: t.delivered_at, icon: "✅", title: `${who} nuvežtas`, text: `${t.to_label} · ${fmtTime(t.delivered_at)}`, href });
    if (t.picked_up_at) list.push({ at: t.picked_up_at, icon: "🚗", title: `${who} paimtas`, text: `${t.from_label} → ${t.to_label}`, href });
    if (t.status === "cancelled") list.push({ at: t.pickup_at, icon: "✖️", title: "Kelionė atšaukta", text: `${who} · ${fmtDay(t.pickup_at)} ${fmtTime(t.pickup_at)}`, href });
    if (t.status === "scheduled" && new Date(t.pickup_at).getTime() > now) list.push({ at: new Date(now).toISOString(), icon: "⏰", title: `Netrukus: ${who} ${fmtTime(t.pickup_at)}`, text: `${t.from_label} → ${t.to_label}`, href });
    if (t.status_note && t.status === "scheduled") list.push({ at: t.pickup_at, icon: "ℹ️", title: "Vairuotojo žinutė", text: t.status_note, href });
  }
  for (const x of subs ?? []) {
    const who = (x.child as unknown as { first_name: string } | null)?.first_name ?? "Keleivis";
    if (x.status === "pending") list.push({ at: x.created_at, icon: "🕓", title: "Abonementas laukia patvirtinimo", text: who, href: "/tevai/abonementas" });
    if (x.status === "active") list.push({ at: x.starts_on ? `${x.starts_on}T08:00:00Z` : x.created_at, icon: "🎉", title: "Abonementas patvirtintas", text: who, href: "/tevai/abonementas" });
    if (x.status === "rejected") list.push({ at: x.created_at, icon: "✖️", title: "Abonementas nepatvirtintas", text: who, href: "/tevai/abonementas" });
    if (x.owner_note) list.push({ at: x.created_at, icon: "🔁", title: "Prašymas pakeisti laiką", text: x.owner_note, href: "/tevai/abonementas" });
  }
  for (const v of visits ?? []) list.push({ at: v.created_at, icon: "🤝", title: `Pokalbis su vairuotoju: ${VISIT_STATUS[v.status]?.[0] ?? v.status}`, text: `${v.wanted_date} ${String(v.wanted_time).slice(0, 5)}`, href: "/tevai/susipazinti" });
  list.sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <h1 className="text-2xl font-bold">Pranešimai</h1>
      {list.length === 0 && (
        <div className="card justify-items-center py-8 text-center">
          <span aria-hidden="true" className="text-4xl">🔔</span>
          <p className="muted">Pranešimų dar nėra. Čia matysite, kada keleivis paimtas ir nuvežtas, ir kitus svarbius įvykius.</p>
        </div>
      )}
      {list.length > 0 && (
        <section className="card gap-0 p-2">
          {list.map((n, i) => (
            <Link key={i} href={n.href} className="grid grid-cols-[40px_1fr] items-center gap-3 rounded-xl px-2 py-3 hover:bg-[var(--surface-2)]">
              <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-soft)]">{n.icon}</span>
              <span className="grid min-w-0"><b className="truncate">{n.title}</b><span className="truncate text-sm muted">{n.text}</span></span>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
