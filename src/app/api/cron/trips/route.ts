import { NextResponse, type NextRequest } from "next/server";
import { generateTrips } from "@/lib/trips";
import { expireOffers } from "@/lib/offers";

// Kasdien sukuria ilgalaikių užsakymų keliones 4 savaitėms į priekį (Vercel Cron)
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  const n = await generateTrips();
  return NextResponse.json({ created: n, expiredOffers: await expireOffers() });
}
