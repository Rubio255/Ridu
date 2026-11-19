import { Shell } from "@/components/shell";
import { requireProfile } from "@/lib/auth";

export default async function L({ children }: { children: React.ReactNode }) {
  const p = await requireProfile();
  return (
    <Shell title="Vaikų pavėžėjimas" name={p.full_name || p.email || ""} tabs={[["/tevai", "Mano kelionės"], ["/tevai/uzsakyti", "Ilgalaikis užsakymas"], ["/tevai/vaikai", "Vaikai ir adresai"]]}>
      {children}
    </Shell>
  );
}
