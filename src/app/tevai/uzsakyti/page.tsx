import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { SubForm } from "./sub-form";

export default async function Page() {
  const me = await requireProfile();
  const sb = await supabaseServer();
  const s = await loadSettings();
  const [{ data: all }, { data: places }, { data: watchOnly }] = await Promise.all([
    sb.from("children").select("id, first_name").order("first_name"),
    sb.from("places").select("id, label, address").order("label"),
    supabaseAdmin().from("child_guardians").select("child_id").eq("profile_id", me.id).eq("relation", "artimasis"),
  ]);
  // Artimieji keleivių, kuriuos tik stebi, užsakyti negali
  const kids = (all ?? []).filter((c) => !(watchOnly ?? []).some((w) => w.child_id === c.id));
  return (
    <SubForm
      kids={kids ?? []} places={places ?? []}
      hours={{ am: `${s.morning_start}–${s.morning_end}`, deliverBy: s.morning_deliver_by, pmStart: s.afternoon_start, pmEnd: s.afternoon_end, bidDay: s.bid_close_day }}
    />
  );
}
