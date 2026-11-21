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
  const [cards, { data: extra }] = await Promise.all([
    driverCards([id]),
    supabaseAdmin().from("drivers").select("bio, since_year").eq("profile_id", id).maybeSingle(),
  ]);
  const d = cards.get(id);
  if (!d) notFound();
  const tel = d.phone?.replace(/\s+/g, "");
  const years = extra?.since_year ? new Date().getFullYear() - extra.since_year : null;

  return (
    <>
      <BackHeader href="/tevai" title="Vairuotojas" />
      <section className="card justify-items-center gap-2 py-6 text-center">
        <Avatar text={initials(d.name)} size={84} />
        <h1 className="text-2xl font-bold">{d.name}</h1>
        {d.verified && <span className="pill p-ok normal-case">✓ Patikimas ir patikrintas vairuotojas</span>}
        {years ? <span className="text-sm muted">Vairuoja {years} m.</span> : null}
        {extra?.bio && <p className="italic">„{extra.bio}“</p>}
      </section>
      <section className="card" aria-labelledby="auto">
        <h2 id="auto" className="font-bold">Automobilis</h2>
        <CarArt className="mx-auto w-full max-w-xs" />
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="grid rounded-xl bg-[var(--surface-2)] p-3"><span className="text-xs muted">Modelis</span><b>{d.car ?? "–"}</b></div>
          <div className="grid rounded-xl bg-[var(--surface-2)] p-3"><span className="text-xs muted">Valst. numeris</span><b className="num tracking-wider">{d.plate ?? "–"}</b></div>
        </div>
        {d.childSeats && <p className="text-sm"><span className="font-bold text-[var(--ok)]">✓</span> Yra vaikiškos kėdutės</p>}
      </section>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/tevai/sutartys" className="btn btn-lg">Peržiūrėti sutartį</Link>
        {tel ? <a href={`tel:${tel}`} className="btn btn-primary btn-lg">Susisiekti</a> : <span className="btn btn-lg opacity-60">Telefono nėra</span>}
      </div>
    </>
  );
}
