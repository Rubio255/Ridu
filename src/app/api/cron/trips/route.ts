import { supabaseAdmin } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { generateTrips } from "@/lib/trips";
import { expireOffers } from "@/lib/offers";

// Kasdien sukuria abonementų keliones 4 savaitėms į priekį (Vercel Cron)
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  const n = await generateTrips();
  // SOS vieta saugoma 30 d., nebent pažymėta tyrimui
  const { count: purgedSos } = await supabaseAdmin().from("sos_events").delete({ count: "exact" }).lt("created_at", new Date(Date.now() - 30 * 864e5).toISOString()).eq("hold", false);
  return NextResponse.json({ created: n, expiredOffers: await expireOffers(), purgedSos });
}
