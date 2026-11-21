import { supabaseServer } from "@/lib/supabase/server";
import { VisitForm } from "@/components/visit-form";
import { BackHeader } from "@/components/client-ui";
import { VISIT_HOW, VISIT_STATUS } from "@/lib/welcome";
import { addDays, vilniusToday } from "@/lib/time";

// Pažintinis pokalbis su vairuotoju ir ankstesnių pokalbių būsena
export default async function Page() {
  const sb = await supabaseServer();
  const { data: visits } = await sb.from("visit_requests").select("id, wanted_date, wanted_time, how, status").order("wanted_date", { ascending: false }).limit(5);
  return (
    <>
      <BackHeader href="/tevai/profilis" title="Susipažinti su vairuotoju" />
      {(visits ?? []).length > 0 && (
        <section className="card"><h2 className="font-bold">Jūsų pokalbiai</h2>
          {(visits ?? []).map((v) => <div key={v.id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{v.wanted_date} {String(v.wanted_time).slice(0, 5)} · {VISIT_HOW[v.how as keyof typeof VISIT_HOW]}</span><span className={`pill ${VISIT_STATUS[v.status][1]}`}>{VISIT_STATUS[v.status][0]}</span></div>)}
        </section>
      )}
      <VisitForm guest={false} drivers={[]} minDate={addDays(vilniusToday(), 1)} />
    </>
  );
}
