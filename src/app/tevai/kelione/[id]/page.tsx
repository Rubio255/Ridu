import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { cancelTrip } from "@/app/actions";
import { cancelFeePct } from "@/lib/pricing";
import { driverCards, firstName, initials } from "@/lib/client-view";
import { eur, fmtDay, fmtTime } from "@/lib/time";
import { mapsLink } from "@/lib/maps";
import { AutoRefresh } from "@/components/auto-refresh";
import { Avatar, StatusPill } from "@/components/client-ui";
import { LiveMap } from "@/components/live-map";
import { LiveEta } from "@/components/live-eta";
import { ShareTrip } from "@/components/share-trip";
import { isLive } from "@/lib/live";

// „Kelionė vyksta“: būsena, gyvas vairuotojo vietos žemėlapis, žingsniai, vairuotojas su skambučiu ir žinute, „Dalintis kelione“.
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
  const live = isLive(t);

  return (
    <>
      {t.status === "picked_up" || (t.status === "scheduled" && Math.abs(hours) < 3) ? <AutoRefresh /> : null}
      <header className="navy-head grid gap-3 text-center">
        <div className="grid grid-cols-[40px_1fr_40px] items-center">
          <Link href="/tevai" aria-label="Atgal" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg">←</Link>
          <div className="grid"><h1 className="text-lg font-bold">{head[0]}</h1><span className="text-sm opacity-80">{t.status === "picked_up" ? "Keleivis jau automobilyje" : live ? "Vairuotojas jau pakeliui" : <span className="capitalize">{fmtDay(t.pickup_at)}</span>}</span></div>
        </div>
        <div className="grid justify-items-center">{live ? <LiveEta src={`/api/vieta/${t.id}`} fallback={head[1]} /> : <b className="text-3xl">{head[1]}</b>}</div>
        <ol className="mx-auto grid w-full max-w-sm grid-cols-3 text-xs" aria-label="Kelionės eiga">
          {[["Vairuotojas atvyksta", "🏠"], ["Kelionė vyksta", "🚗"], ["Atvykome", "🏁"]].map(([l, i], k) => {
            const at = t.status === "delivered" ? 2 : t.status === "picked_up" ? 1 : 0, on = k <= at;
            return <li key={l} className="grid justify-items-center gap-1"><span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-full ${on ? "bg-white text-[var(--navy)]" : "bg-white/20"}`}>{i}</span><span className={on ? "font-bold" : "opacity-70"}>{l}</span></li>;
          })}
        </ol>
      </header>

      {d ? (
        <section className="card -mt-10" aria-labelledby="vairuotojas">
          <h2 id="vairuotojas" className="sr-only">Vairuotojas</h2>
          <Link href={`/tevai/vairuotojas/${d.id}`} className="flex items-center gap-3">
            <Avatar text={initials(d.name)} size={64} />
            <div className="grid min-w-0 flex-1">
              <b className="truncate text-lg">{d.name}</b>
              {d.verified && <span className="text-sm font-semibold text-[var(--ok)]">✓ Patikimas ir patikrintas vairuotojas</span>}
              <span className="truncate text-sm">{d.car ?? "Automobilis bus nurodytas"}</span>
              {d.plate && <span className="justify-self-start rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs font-bold">{d.plate}</span>}
            </div>
          </Link>
          {tel ? (
            <div className="grid grid-cols-2 border-t border-[var(--line)] pt-2 text-sm font-semibold">
              <a href={`tel:${tel}`} className="grid justify-items-center gap-1 py-1"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--soft-blue)]">📞</span>Skambinti</a>
              <a href={`sms:${tel}`} className="grid justify-items-center gap-1 py-1"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-[var(--soft-blue)]">💬</span>Žinutė</a>
            </div>
          ) : <p className="text-sm muted">Vairuotojo telefonas dar nenurodytas. Susisiekite su MB.</p>}
        </section>
      ) : <div className="card -mt-10 muted">Vairuotojas bus priskirtas prieš kelionę.</div>}

      {live && <div id="zemelapis" className="scroll-mt-4"><LiveMap src={`/api/vieta/${t.id}`} /></div>}
      <a href={live ? "#zemelapis" : mapsLink(t.from_address, t.to_address)} {...(live ? {} : { target: "_blank", rel: "noopener" })} className="btn btn-lg rounded-full shadow-sm">Stebėti maršrutą ➤</a>

      <section className="card" aria-label="Kelionės informacija">
        <div className="flex items-center justify-between gap-2"><b className="text-lg">{t.child.first_name}</b><StatusPill s={t.status} /></div>
        <span className="text-sm muted">{t.from_label} → {t.to_label} · paėmimas {fmtTime(t.pickup_at)}</span>
        {t.status_note && <p className="rounded-xl bg-[var(--surface-2)] p-3 text-sm font-semibold">{t.status_note}</p>}
        <div className="flex justify-between border-t border-[var(--line)] pt-3 text-sm"><span className="muted">Kaina</span><b className="num">{eur(t.price_eur)}</b></div>
      </section>

      {t.child.passenger_type === "child" && t.status === "scheduled" && (
        <section className="card bg-[var(--accent-soft)]">
          <h2 className="font-bold">Slaptas žodis</h2>
          {t.child.code_word
            ? <p className="text-sm">Vairuotojas pasakys vaikui jūsų slaptą žodį. Priminkite vaikui, kad sėstų tik išgirdęs jį.</p>
            : <Link href="/tevai/vaikai#slaptas-zodis" className="text-sm font-semibold underline">Sukurkite slaptą žodį vaikui</Link>}
        </section>
      )}

      {(t.status === "scheduled" || t.status === "picked_up") && <ShareTrip tripId={t.id} title={`${t.child.first_name}: ${t.from_label} → ${t.to_label}, ${fmtTime(t.pickup_at)}`} />}

      {names.length > 0 && <p className="text-sm muted">Pranešimus gauna: {names.join(", ")}</p>}

      {t.status === "scheduled" && hours > 0 && canEdit && (
        <form action={cancelTrip}><input type="hidden" name="id" value={t.id} />
          <button className="btn btn-bad btn-lg w-full">Atšaukti kelionę{fee ? ` (mokestis ${fee}%)` : ""}</button></form>
      )}
    </>
  );
}
