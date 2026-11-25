import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { savePlanRequest } from "@/lib/client-plan";

// Nuoroda iš el. laiško (prisijungimas, registracija ar kvietimas)
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  // Prieš registraciją pasirinktas planas: slapukas iš prisijungimo formos (tas pats įrenginys)
  const plan = req.cookies.get("ridu_plan")?.value;
  if (code) {
    const sb = await supabaseServer();
    const { data } = await sb.auth.exchangeCodeForSession(code);
    const u = data.user;
    // Nuoroda atidaryta kitame įrenginyje: planas imamas iš registracijos duomenų, bet tik ką sukurtai paskyrai,
    // kad vėlesni prisijungimai nuoroda nekeistų jau patvirtinto plano
    const fresh = u && Date.now() - new Date(u.created_at).getTime() < 24 * 36e5;
    const p = plan ?? (fresh && typeof u.user_metadata?.plan === "string" ? u.user_metadata.plan : undefined);
    if (p && u) await savePlanRequest(u.id, p);
  }
  const res = NextResponse.redirect(new URL("/", req.url));
  if (plan) res.cookies.delete("ridu_plan");
  return res;
}
