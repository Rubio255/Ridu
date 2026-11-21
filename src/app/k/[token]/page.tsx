import { Ico } from "@/components/ico";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { PublicPage } from "@/components/info";
import { TripSteps } from "@/components/trip-steps";
import { LiveMap } from "@/components/live-map";
import { AutoRefresh } from "@/components/auto-refresh";
import { StatusPill } from "@/components/client-ui";
import { driverCards, firstName } from "@/lib/client-view";
import { isLive } from "@/lib/live";
import { fmtDay } from "@/lib/time";

export const metadata = { robots: { index: false } };

// Bendrinama kelionė („Dalintis kelione“): be prisijungimo, tik būtiniausia informacija, kol nuoroda galioja
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: t } = await supabaseAdmin().from("trips")
    .select("id, status, pickup_at, picked_up_at, delivered_at, from_label, to_label, driver_id, share_expires_at, child:children(first_name)").eq("share_token", token).maybeSingle();
  if (!t || !t.share_expires_at || new Date(t.share_expires_at) < new Date()) notFound();
  const d = t.driver_id ? (await driverCards([t.driver_id])).get(t.driver_id) : undefined;
  const child = (t.child as unknown as { first_name: string } | null)?.first_name ?? "Keleivis";
  return (
    <PublicPage title="Kelionė">
      {(t.status === "scheduled" || t.status === "picked_up") && <AutoRefresh />}
      {isLive(t) && <LiveMap src={`/api/k/${token}`} />}
      <section className="card">
        <div className="flex items-center justify-between gap-2"><b className="text-lg">{child}</b><StatusPill s={t.status} /></div>
        <span className="text-sm muted capitalize">{fmtDay(t.pickup_at)}</span>
        <TripSteps t={t} />
        {d && <p className="text-sm">Vairuotojas <b>{firstName(d.name)}</b>{d.car ? `, ${d.car}` : ""}{d.plate ? ` (${d.plate})` : ""}{d.verified && <span className="flex items-center gap-1 font-semibold text-[var(--ok)]"><Ico n="shield" size={16} />Patikimas ir patikrintas vairuotojas</span>}</p>}
      </section>
      <p className="text-xs muted">Šia nuoroda pasidalijo keleivio artimasis. Ji galioja ribotą laiką.</p>
    </PublicPage>
  );
}
