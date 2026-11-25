import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { savePlanRequest } from "@/lib/client-plan";

// Nuoroda iš el. laiško (prisijungimas, registracija ar kvietimas)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  // Prieš registraciją pasirinktas planas (slapukas nustatomas prisijungimo formoje)
  const plan = req.cookies.get("ridu_plan")?.value;
  if (code) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.exchangeCodeForSession(code);
    if (plan && data.user) await savePlanRequest(data.user.id, plan);
  }
  const res = NextResponse.redirect(new URL("/", req.url));
  if (plan) res.cookies.delete("ridu_plan");
  return res;
}
