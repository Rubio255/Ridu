import { requireProfile, loadSettings } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { SubForm } from "./sub-form";

export default async function Page() {
  await requireProfile();
  const sb = await supabaseServer();
  const s = await loadSettings();
  const [{ data: kids }, { data: places }] = await Promise.all([
    sb.from("children").select("id, first_name").order("first_name"),
    sb.from("places").select("id, label, address").order("label"),
  ]);
  return (
    <SubForm
      kids={kids ?? []} places={places ?? []}
      hours={{ am: `${s.morning_start}–${s.morning_end}`, deliverBy: s.morning_deliver_by, pmStart: s.afternoon_start, pmEnd: s.afternoon_end, bidDay: s.bid_close_day }}
    />
  );
}
