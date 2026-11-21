import { Ico } from "@/components/ico";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { initials } from "@/lib/client-view";
import { planState } from "@/lib/client-plan";
import { PLAN_NAMES, type PlanId } from "@/lib/settings";
import { Avatar } from "@/components/client-ui";

// Profilis kaip makete: nuotrauka ir vardas, meniu su piktogramomis, „Atsijungti“
export default async function Page() {
  const me = await requireProfile();
  const st = await planState(me.id);
  const plan = st?.plan_id ? `${PLAN_NAMES[st.plan_id as PlanId]} planas` : "Abonementai ir planai";
  const MENU: [string, string, string, string?][] = [
    ["/tevai/abonementas", "ticket", "Mano abonementas", plan],
    ["/tevai/mokejimai", "card", "Mokėjimo būdai"],
    ["/tevai/vaikai", "family", "Šeimos nariai"],
    ["/tevai/istorija", "history", "Kelionių istorija"],
    ["/paskyra", "bell", "Pranešimų nustatymai"],
    ["/tevai/saugumas", "shield", "Saugumo nustatymai"],
    ["/tevai/sutartys", "file", "Sutartys"],
    ["/privatumas#pagalba", "help", "Pagalba ir palaikymas"],
    ["/tevai/pradzia", "info", "Apie programėlę"],
  ];
  return (
    <>
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <Link href="/tevai" aria-label="Atgal" className="grid h-10 w-10 place-items-center text-2xl text-[var(--navy)]"><Ico n="back" /></Link>
        <h1 className="text-center text-xl font-bold">Profilis</h1>
        <Link href="/paskyra" aria-label="Nustatymai" className="grid h-10 w-10 place-items-center text-[var(--navy)]"><Ico n="settings" /></Link>
      </div>
      <section className="flex items-center gap-4 px-1">
        <Avatar text={initials(me.full_name || me.email || "?")} size={68} />
        <div className="grid min-w-0"><b className="truncate text-xl">{me.full_name || "Jūsų profilis"}</b><span className="truncate text-sm muted">{me.email}</span></div>
      </section>
      <nav className="card gap-0 p-1" aria-label="Profilio meniu">
        {MENU.map(([href, icon, label, sub]) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[var(--surface-2)]">
            <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-[var(--soft-blue)] text-[var(--navy)]"><Ico n={icon} size={18} /></span>
            <span className="grid flex-1"><span className="font-semibold">{label}</span>{sub && <span className="text-xs muted">{sub}</span>}</span>
            <span aria-hidden="true" className="muted">›</span>
          </Link>
        ))}
      </nav>
      <form action={signOut}><button className="btn btn-lg w-full rounded-full border-0 bg-[var(--surface-2)]">Atsijungti</button></form>
    </>
  );
}
