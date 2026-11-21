import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { driverCards, initials } from "@/lib/client-view";
import { Avatar, BackHeader, CarArt } from "@/components/client-ui";

// Vairuotojo profilis: rodomas tik tiems klientams, kuriuos jis veža ar veš
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  // RLS: klientas mato tik savo šeimos abonementus ir keliones
  const [{ count: subs }, { count: trips }] = await Promise.all([
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("driver_id", id).in("status", ["pending", "active", "ended"]),
    sb.from("trips").select("id", { count: "exact", head: true }).eq("driver_id", id),
  ]);
  if (!subs && !trips) notFound();
  const [cards, { data: contract }, { data: extra }] = await Promise.all([
    driverCards([id]),
    sb.from("subscriptions").select("starts_on, ends_on, months").eq("driver_id", id).eq("status", "active").order("ends_on", { ascending: false, nullsFirst: true }).limit(1).maybeSingle(),
    supabaseAdmin().from("drivers").select("bio, since_year").eq("profile_id", id).maybeSingle(),
  ]);
  const d = cards.get(id);
  if (!d) notFound();
  const tel = d.phone?.replace(/\s+/g, "");
  const years = extra?.since_year ? new Date().getFullYear() - extra.since_year : null;

  const until = contract ? (contract.ends_on ?? (contract.starts_on && contract.months > 1 ? (() => { const x = new Date(contract.starts_on); x.setMonth(x.getMonth() + contract.months); return x.toISOString().slice(0, 10); })() : null)) : null;

  return (
    <>
      <BackHeader href="/tevai" title="Vairuotojas" />
      <section className="card gap-3 overflow-hidden p-0">
        <div className="relative bg-gradient-to-b from-[var(--soft-blue)] to-[var(--surface)] px-6 pt-8">
          <CarArt className="mx-auto w-full max-w-xs" />
          {contract && <span className="absolute right-3 top-3 rounded-full bg-[var(--ok-bg)] px-3 py-1 text-sm font-bold text-[var(--ok)]">Aktyvus</span>}
        </div>
        <div className="grid gap-1 px-4">
          <div className="flex items-center gap-3"><Avatar text={initials(d.name)} size={48} /><h1 className="text-2xl font-bold">{d.name}</h1></div>
          {d.verified && <span className="font-semibold text-[var(--ok)]">✓ Patikimas ir patikrintas vairuotojas</span>}
          {years ? <span className="text-sm muted">Vairuoja {years} m.</span> : null}
          {extra?.bio && <p className="italic">„{extra.bio}“</p>}
        </div>
        <ul className="grid gap-2 px-4 pb-4">
          <li className="flex items-center gap-3"><span aria-hidden="true">🚘</span>{d.car ?? "Automobilis bus nurodytas"}</li>
          {d.plate && <li className="flex items-center gap-3"><span aria-hidden="true">🪪</span><span className="num tracking-wider">{d.plate}</span></li>}
          {d.phone && <li className="flex items-center gap-3"><span aria-hidden="true">📞</span>{d.phone}</li>}
          {d.childSeats && <li className="flex items-center gap-3"><span aria-hidden="true">✓</span>Yra vaikiškos kėdutės</li>}
        </ul>
      </section>
      {contract && (
        <section className="card gap-1"><b>Sutarties informacija</b><span className="muted">{until ? `Galioja iki: ${until}` : "Pratęsiama kas mėnesį"}</span></section>
      )}
      <Link href="/tevai/sutartys" className="btn btn-lg rounded-full border-0 bg-[var(--soft-blue)] text-[var(--navy)]">Peržiūrėti sutartį</Link>
      {tel ? <a href={`tel:${tel}`} className="btn btn-lg rounded-full shadow-sm">🎧 Susisiekti</a> : <span className="btn btn-lg rounded-full opacity-60">Telefono nėra</span>}
    </>
  );
}
