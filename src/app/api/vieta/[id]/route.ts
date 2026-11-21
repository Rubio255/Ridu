import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { livePayload } from "@/lib/live";

// Kelionės gyva vieta prisijungusiam: kelionę (per RLS) mato tik keleivio globėjai, artimieji, vairuotojas ir MB
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await supabaseServer();
  const { data: t } = await sb.from("trips").select("id, status, pickup_at, subscription_id").eq("id", id).maybeSingle();
  if (!t) return NextResponse.json({ error: "Nerasta" }, { status: 404 });
  return NextResponse.json(await livePayload(t), { headers: { "cache-control": "no-store" } });
}
