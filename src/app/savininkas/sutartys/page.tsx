import { supabaseAdmin } from "@/lib/supabase/server";
import { Contracts, CONTRACT_SELECT, toFilter, type ContractRow } from "@/components/contracts";

export default async function Page({ searchParams }: { searchParams: Promise<{ rodyti?: string }> }) {
  const { rodyti } = await searchParams;
  const { data } = await supabaseAdmin().from("subscriptions").select(CONTRACT_SELECT).in("status", ["active", "ended"]).order("starts_on", { ascending: false });
  return <><h1 className="text-xl font-bold">Sutartys</h1><Contracts rows={(data ?? []) as unknown as ContractRow[]} filter={toFilter(rodyti)} base="/savininkas/sutartys" owner /></>;
}
