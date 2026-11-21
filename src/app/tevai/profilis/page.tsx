import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { initials } from "@/lib/client-view";
import { Avatar } from "@/components/client-ui";

const MENU: [string, string, string][] = [
  ["/tevai/abonementas", "🎫", "Mano abonementas ir planas"],
  ["/tevai/mokejimai", "💳", "Mokėjimai ir sąskaitos"],
  ["/tevai/vaikai", "👨‍👩‍👧", "Šeimos nariai ir adresai"],
  ["/tevai/istorija", "🕘", "Kelionių istorija"],
  ["/tevai/pranesimai", "🔔", "Pranešimai"],
  ["/tevai/sutartys", "📄", "Sutartys"],
  ["/tevai/susipazinti", "🤝", "Susipažinti su vairuotoju"],
  ["/tevai/pradzia", "ℹ️", "Apie Ridu"],
  ["/tevai/salygos", "📋", "Sąlygos ir privatumas"],
  ["/paskyra", "⚙️", "Paskyra ir pranešimų nustatymai"],
];

export default async function Page() {
  const me = await requireProfile();
  return (
    <>
      <section className="card justify-items-center gap-2 py-6 text-center">
        <Avatar text={initials(me.full_name || me.email || "?")} size={76} />
        <h1 className="text-xl font-bold">{me.full_name || "Jūsų profilis"}</h1>
        <span className="text-sm muted">{me.email}</span>
      </section>
      <nav className="card gap-0 p-2" aria-label="Profilio meniu">
        {MENU.map(([href, icon, label]) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[var(--surface-2)]">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--brand-soft)]">{icon}</span>
            <span className="flex-1 font-semibold">{label}</span><span aria-hidden="true" className="muted">›</span>
          </Link>
        ))}
      </nav>
      <form action={signOut}><button className="btn btn-bad btn-lg w-full">Atsijungti</button></form>
    </>
  );
}
