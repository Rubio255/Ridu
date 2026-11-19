import { requireProfile } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { Contracts, CONTRACT_SELECT, toFilter, type ContractRow } from "@/components/contracts";

// RLS rodo tik sutartis vaikų, kurių globėjas yra prisijungęs tėvas
export default async function Page({ searchParams }: { searchParams: Promise<{ rodyti?: string }> }) {
  const me = await requireProfile();
  const { rodyti } = await searchParams;
  const sb = await supabaseServer();
  const { data } = await sb.from("subscriptions").select(CONTRACT_SELECT).in("status", ["active", "ended"]).order("starts_on", { ascending: false });
  return <><h1 className="text-xl font-bold">Mano sutartys</h1><Contracts rows={(data ?? []) as unknown as ContractRow[]} filter={toFilter(rodyti)} base="/tevai/sutartys" owner={false} me={me.id} /></>;
}
