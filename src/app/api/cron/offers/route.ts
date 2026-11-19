import { NextResponse, type NextRequest } from "next/server";
import { expireOffers } from "@/lib/offers";

// Kas 15 min.: neatsakyti pakaitos pasiūlymai pasiūlomi kitam laisvam vairuotojui
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ expired: await expireOffers() });
}
