import { requireProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { loadDrivers, assignable } from "@/lib/drivers";
import { Welcome } from "@/components/welcome";
import { VISIT_HOW, VISIT_STATUS } from "@/lib/welcome";

export default async function Page() {
  const me = await requireProfile();
  const sb = await supabaseServer();
  // RLS: matomos tik sutartys keleivių, kurių globėjas yra prisijungęs klientas
  const [{ data: subs }, { data: visits }, all] = await Promise.all([
    sb.from("subscriptions").select("driver_id").eq("status", "active"),
    sb.from("visit_requests").select("id, wanted_date, wanted_time, how, status").order("wanted_date", { ascending: false }).limit(5),
    loadDrivers(),
  ]);
  const ids = new Set((subs ?? []).map((x) => x.driver_id).filter(Boolean));
  const mine = all.filter((d) => ids.has(d.profile_id));
  return (
    <>
      <Welcome drivers={mine.length ? mine : all.filter(assignable)} guest={false} mine={mine.length > 0} greeting={`Sveiki${me.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}!`} />
      {(visits ?? []).length > 0 && (
        <section className="card"><h2 className="font-bold">Jūsų pokalbiai</h2>
          {(visits ?? []).map((v) => <div key={v.id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{v.wanted_date} {String(v.wanted_time).slice(0, 5)} · {VISIT_HOW[v.how as keyof typeof VISIT_HOW]}</span><span className={`pill ${VISIT_STATUS[v.status][1]}`}>{VISIT_STATUS[v.status][0]}</span></div>)}
        </section>
      )}
    </>
  );
}
