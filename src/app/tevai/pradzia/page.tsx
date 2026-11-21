import { requireProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Welcome } from "@/components/welcome";
import { VISIT_HOW, VISIT_STATUS } from "@/lib/welcome";

export default async function Page() {
  const me = await requireProfile();
  const sb = await supabaseServer();
  const [{ data: visits }] = await Promise.all([
    sb.from("visit_requests").select("id, wanted_date, wanted_time, how, status").order("wanted_date", { ascending: false }).limit(5),
  ]);
  return (
    <>
      <Welcome guest={false} greeting={`Sveiki${me.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}!`} />
      {(visits ?? []).length > 0 && (
        <section className="card"><h2 className="font-bold">Jūsų pokalbiai</h2>
          {(visits ?? []).map((v) => <div key={v.id} className="flex flex-wrap justify-between gap-2 text-sm"><span>{v.wanted_date} {String(v.wanted_time).slice(0, 5)} · {VISIT_HOW[v.how as keyof typeof VISIT_HOW]}</span><span className={`pill ${VISIT_STATUS[v.status][1]}`}>{VISIT_STATUS[v.status][0]}</span></div>)}
        </section>
      )}
    </>
  );
}
