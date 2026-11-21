import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { eur, vilniusToDate, vilniusToday } from "@/lib/time";
import { BackHeader, TripRow, type TripLite } from "@/components/client-ui";

const TABS = [["visos", "Visos"], ["men", "Šį mėnesį"], ["praej", "Praėjusį"]] as const;

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
        {trips.map((t) => <TripRow key={t.id} t={t} day />)}
      </section>
    </>
  );
}
