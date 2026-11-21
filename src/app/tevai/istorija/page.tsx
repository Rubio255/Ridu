import { Ico } from "@/components/ico";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { eur, fmtWhen, vilniusToDate, vilniusToday } from "@/lib/time";
import { BackHeader, type TripLite } from "@/components/client-ui";

const TABS = [["visos", "Visos"], ["men", "Šį mėnesį"], ["praej", "Praėjusį mėnesį"]] as const;

function monthStart(ym: string, add = 0) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + add, 1));
  return d.toISOString().slice(0, 10);
}

// Kelionių istorija: baigtos, atšauktos ir praleistos kelionės
export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const tab = TABS.some(([k]) => k === f) ? f! : "visos";
  const ym = vilniusToday().slice(0, 7);
  const sb = await supabaseServer();
  let q = sb.from("trips").select("id, pickup_at, status, from_label, to_label, price_eur, child:children(first_name)").lt("pickup_at", new Date().toISOString());
  if (tab === "men") q = q.gte("pickup_at", vilniusToDate(monthStart(ym), "00:00").toISOString());
  if (tab === "praej") q = q.gte("pickup_at", vilniusToDate(monthStart(ym, -1), "00:00").toISOString()).lt("pickup_at", vilniusToDate(monthStart(ym), "00:00").toISOString());
  const { data } = await q.order("pickup_at", { ascending: false }).limit(100);
  const trips = (data ?? []) as unknown as TripLite[];
  const done = trips.filter((t) => t.status === "delivered");

  return (
    <>
      <BackHeader href="/tevai/grafikas" title="Kelionių istorija" />
      <nav className="seg" aria-label="Laikotarpis">
        {TABS.map(([k, l]) => <Link key={k} href={`/tevai/istorija?f=${k}`} aria-current={tab === k ? "page" : undefined}>{l}</Link>)}
      </nav>
      {tab !== "visos" && trips.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card gap-0.5"><span className="text-sm muted">Nuvežta kelionių</span><b className="num text-2xl">{done.length}</b></div>
          <div className="card gap-0.5"><span className="text-sm muted">Kelionių vertė</span><b className="num text-2xl">{eur(done.reduce((a, t) => a + Number(t.price_eur ?? 0), 0))}</b></div>
        </div>
      )}
      <section className="card">
        {trips.length === 0 && <p className="py-6 text-center muted">Šiuo laikotarpiu kelionių nebuvo.</p>}
        {trips.map((t) => (
          <Link key={t.id} href={`/tevai/kelione/${t.id}`} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-t border-[var(--line)] pt-3 first-of-type:border-0 first-of-type:pt-0">
            <span aria-hidden="true" className={`grid h-7 w-7 place-items-center rounded-full text-white ${t.status === "delivered" ? "bg-[var(--ok)]" : "bg-[var(--bad)]"}`}><Ico n={t.status === "delivered" ? "check" : "x"} size={16} stroke={2.8} /></span>
            <span className="grid min-w-0"><b>{fmtWhen(t.pickup_at)}</b><span className="truncate text-sm">{t.from_label} → {t.to_label}</span>{t.status !== "delivered" && <span className="text-xs muted">{t.status === "cancelled" ? "Atšaukta" : t.status === "no_show" ? "Neatvyko" : "Suplanuota"}</span>}</span>
            <b className="num">{eur(Number(t.price_eur ?? 0))}</b>
          </Link>
        ))}
      </section>
    </>
  );
}
