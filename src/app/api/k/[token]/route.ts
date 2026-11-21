import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { livePayload } from "@/lib/live";

// Bendrinamos kelionės vieta pagal nuorodą (be prisijungimo), kol nuoroda galioja
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: t } = await supabaseAdmin().from("trips").select("id, status, pickup_at, subscription_id, share_expires_at").eq("share_token", token).maybeSingle();
  if (!t || !t.share_expires_at || new Date(t.share_expires_at) < new Date()) return NextResponse.json({ error: "Nuoroda nebegalioja" }, { status: 404 });
  return NextResponse.json(await livePayload(t), { headers: { "cache-control": "no-store" } });
}
