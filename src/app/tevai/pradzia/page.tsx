import { requireProfile } from "@/lib/auth";
import { Welcome } from "@/components/welcome";
import { firstName } from "@/lib/client-view";

// Apie Ridu prisijungusiam klientui: tas pats pirmas ekranas, nuorodos veda į programėlės puslapius
export default async function Page() {
  const me = await requireProfile();
  return <Welcome guest={false} greeting={`Sveiki${me.full_name ? `, ${firstName(me.full_name)}` : ""}!`} />;
}
