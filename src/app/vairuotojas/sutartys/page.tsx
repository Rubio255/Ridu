import { requireDriver } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { Contracts, CONTRACT_SELECT, toFilter, type ContractRow } from "@/components/contracts";

export default async function Page({ searchParams }: { searchParams: Promise<{ rodyti?: string }> }) {
  const me = await requireDriver();
  const { rodyti } = await searchParams;
  const { data } = await supabaseAdmin().from("subscriptions").select(CONTRACT_SELECT).eq("driver_id", me.id).in("status", ["active", "ended"]).order("starts_on", { ascending: false });
  return <><h1 className="text-xl font-bold">Mano sutartys</h1><Contracts rows={(data ?? []) as unknown as ContractRow[]} filter={toFilter(rodyti)} base="/vairuotojas/sutartys" owner canEnd={false} label="Sutarčių vertė per mėnesį" /></>;
}
