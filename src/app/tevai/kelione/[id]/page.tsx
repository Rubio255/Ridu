import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { cancelTrip } from "@/app/actions";
import { cancelFeePct } from "@/lib/pricing";
import { driverCards, firstName, initials } from "@/lib/client-view";
import { eur, fmtDay, fmtTime } from "@/lib/time";
import { TripSteps } from "@/components/trip-steps";
import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar, StatusPill } from "@/components/client-ui";

// „Kelionė vyksta“: būsena, žingsniai, vairuotojas su skambučiu ir žinute. Be gyvo GPS: rodome tik tikrus laikus.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [me, s, sb] = await Promise.all([requireProfile(), loadSettings(), supabaseServer()]);
  // RLS: kelionę mato tik keleivio globėjai ir artimieji
  const { data: t } = await sb.from("trips").select("*, child:children(first_name, passenger_type, code_word)").eq("id", id).maybeSingle();
  if (!t) notFound();
  const [drivers, { data: rel }, { data: watchers }] = await Promise.all([
    driverCards([t.driver_id]),
    sb.from("child_guardians").select("relation").eq("child_id", t.child_id).eq("profile_id", me.id).maybeSingle(),
    supabaseAdmin().from("child_guardians").select("profile:profiles(full_name)").eq("child_id", t.child_id),
  ]);
  const d = t.driver_id ? drivers.get(t.driver_id) : undefined;
  const canEdit = !!rel && rel.relation !== "artimasis";
  const now = new Date();
  const hours = (new Date(t.pickup_at).getTime() - now.getTime()) / 36e5;
  const fee = cancelFeePct(s, hours);
  const names = (watchers ?? []).map((w) => firstName((w.profile as unknown as { full_name: string } | null)?.full_name)).filter(Boolean);
  const head = t.status === "picked_up" ? ["Kelionė vyksta", t.picked_up_at ? `Kelyje nuo ${fmtTime(t.picked_up_at)}` : "Keleivis paimtas"]
    : t.status === "delivered" ? ["Kelionė baigta", t.delivered_at ? `Nuvežta ${fmtTime(t.delivered_at)}` : "Nuvežta"]
    : t.status === "scheduled" ? ["Kelionė suplanuota", `Paėmimas ${fmtTime(t.pickup_at)}`]
    : ["Kelionė", ""];
  const tel = d?.phone?.replace(/\s+/g, "");

  return (
    <>
      {t.status === "picked_up" || (t.status === "scheduled" && Math.abs(hours) < 3) ? <AutoRefresh /> : null}
      <section className="-mx-4 first:-mt-5 grid gap-3 bg-[var(--brand)] px-4 pb-6 pt-4 text-[var(--brand-fg)]">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/tevai" aria-label="Atgal" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-lg">←</Link>
          <h1 className="text-center text-lg font-bold">{head[0]}</h1>
        </div>
        <div className="grid justify-items-center gap-1 text-center">
          <span className="text-3xl font-bold">{head[1]}</span>
          <span className="opacity-85">{fmtDay(t.pickup_at)}</span>
        </div>
      </section>

      <section className="card -mt-8" aria-label="Kelionės eiga">
        <div className="flex items-center justify-between gap-2"><b className="text-lg">{t.child.first_name}</b><StatusPill s={t.status} /></div>
        <TripSteps t={t} />
        {t.status_note && <p className="rounded-xl bg-[var(--surface-2)] p-3 text-sm font-semibold">{t.status_note}</p>}
        <div className="flex justify-between border-t border-[var(--line)] pt-3 text-sm"><span className="muted">Kaina</span><b className="num">{eur(t.price_eur)}</b></div>
      </section>

      {d ? (
        <section className="card" aria-labelledby="vairuotojas">
          <h2 id="vairuotojas" className="sr-only">Vairuotojas</h2>
          <Link href={`/tevai/vairuotojas/${d.id}`} className="flex items-center gap-3">
            <Avatar text={initials(d.name)} size={52} />
            <div className="grid min-w-0 flex-1">
              <b className="truncate text-lg">{d.name}</b>
              <span className="truncate text-sm muted">{[d.car, d.plate].filter(Boolean).join(" · ") || "Automobilis bus nurodytas"}</span>
              {d.verified && <span className="text-sm font-semibold text-[var(--ok)]">✓ Patikimas ir patikrintas vairuotojas</span>}
            </div>
            <span aria-hidden="true" className="muted">›</span>
          </Link>
          {tel ? (
            <div className="grid grid-cols-2 gap-3">
              <a href={`tel:${tel}`} className="btn btn-brand btn-lg">📞 Skambinti</a>
              <a href={`sms:${tel}`} className="btn btn-lg">💬 Žinutė</a>
            </div>
          ) : <p className="text-sm muted">Vairuotojo telefonas dar nenurodytas. Susisiekite su MB.</p>}
        </section>
      ) : <div className="card muted">Vairuotojas bus priskirtas prieš kelionę.</div>}

      {t.child.passenger_type === "child" && t.status === "scheduled" && (
        <section className="card bg-[var(--accent-soft)]">
          <h2 className="font-bold">Slaptas žodis</h2>
          {t.child.code_word
            ? <p className="text-sm">Vairuotojas pasakys vaikui jūsų slaptą žodį. Priminkite vaikui, kad sėstų tik išgirdęs jį.</p>
            : <Link href="/tevai/vaikai#slaptas-zodis" className="text-sm font-semibold underline">Sukurkite slaptą žodį vaikui</Link>}
        </section>
      )}

      {names.length > 0 && <p className="text-sm muted">Pranešimus gauna: {names.join(", ")}</p>}

      {t.status === "scheduled" && hours > 0 && canEdit && (
        <form action={cancelTrip}><input type="hidden" name="id" value={t.id} />
          <button className="btn btn-bad btn-lg w-full">Atšaukti kelionę{fee ? ` (mokestis ${fee}%)` : ""}</button></form>
      )}
    </>
  );
}
