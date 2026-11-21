import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { addDays, fmtDay, vilniusToDate, vilniusToday, dayKey } from "@/lib/time";
import { TripRow, type TripLite } from "@/components/client-ui";

const TABS = [["siandien", "Šiandien"], ["rytoj", "Rytoj"], ["savaite", "Savaitė"]] as const;

// Kelionės (grafikas): šiandien, rytoj arba 7 dienos į priekį
export default async function Page({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const tab = TABS.some(([k]) => k === d) ? d! : "siandien";
  const today = vilniusToday();
  const from = tab === "rytoj" ? addDays(today, 1) : today;
  const to = tab === "savaite" ? addDays(today, 7) : addDays(from, 1);
  const sb = await supabaseServer();
  const { data } = await sb.from("trips").select("id, pickup_at, status, from_label, to_label, child:children(first_name)")
    .gte("pickup_at", vilniusToDate(from, "00:00").toISOString()).lt("pickup_at", vilniusToDate(to, "00:00").toISOString()).order("pickup_at");
  const trips = (data ?? []) as unknown as TripLite[];
  const byDay = new Map<string, TripLite[]>();
  trips.forEach((t) => { const k = dayKey(t.pickup_at); byDay.set(k, [...(byDay.get(k) ?? []), t]); });

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Kelionės</h1>
        <Link href="/tevai/istorija" className="text-sm font-semibold text-[var(--brand)]">Istorija</Link>
      </div>
      <nav className="seg" aria-label="Laikotarpis">
        {TABS.map(([k, l]) => <Link key={k} href={`/tevai/grafikas?d=${k}`} aria-current={tab === k ? "page" : undefined}>{l}</Link>)}
      </nav>
      {trips.length === 0 && (
        <div className="card justify-items-center py-8 text-center">
          <span aria-hidden="true" className="text-4xl">🗓️</span>
          <p className="muted">{tab === "siandien" ? "Šiandien kelionių nėra." : tab === "rytoj" ? "Rytoj kelionių nėra." : "Šią savaitę kelionių nėra."}</p>
          <Link href="/tevai/uzsakyti" className="btn btn-primary">+ Nauja kelionė</Link>
        </div>
      )}
      {[...byDay.entries()].map(([k, list]) => (
        <section key={k} className="card" aria-label={fmtDay(list[0].pickup_at)}>
          <h2 className="text-sm font-bold capitalize muted">{fmtDay(list[0].pickup_at)}</h2>
          {list.map((t) => <TripRow key={t.id} t={t} />)}
        </section>
      ))}
    </>
  );
}
