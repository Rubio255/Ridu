import { createServerClient } from "@supabase/ssr";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Naudotojo sesijos klientas (taikomos RLS taisyklės)
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* server component */ }
      },
    },
  });
}

// Serverio klientas be RLS. Naudoti tik serverio veiksmuose po teisių patikros.
export function supabaseAdmin() {
  return createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
