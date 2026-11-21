import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Atnaujina prisijungimo sesiją ir neprisijungusius nukreipia į prisijungimą
export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  // getClaims atnaujina sesiją ir patikrina raktą vietoje (be kreipimosi į Auth serverį, kai raktai asimetriniai)
  const { data } = await sb.auth.getClaims();
  const user = data?.claims?.sub;
  const p = req.nextUrl.pathname;
  const open = p === "/" || p === "/sw.js" || p.startsWith("/prisijungti") || p.startsWith("/auth") || p.startsWith("/api/cron") || p === "/privatumas";
  if (!user && !open) return NextResponse.redirect(new URL("/prisijungti", req.url));
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|webmanifest)$).*)"] };
