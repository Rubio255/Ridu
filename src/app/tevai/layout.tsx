import { Shell } from "@/components/shell";
import { requireProfile } from "@/lib/auth";
import { EnablePush } from "@/components/enable-push";

export default async function L({ children }: { children: React.ReactNode }) {
  const p = await requireProfile();
  return (
    <Shell title="Išsiskyrusiems" name={p.full_name || p.email || ""} tabs={[["/tevai", "Mano kelionės"], ["/tevai/uzsakyti", "Ilgalaikis užsakymas"], ["/tevai/sutartys", "Sutartys"], ["/tevai/vaikai", "Vaikai ir adresai"]]}>
      <EnablePush who="client" />
      {children}
    </Shell>
  );
}
