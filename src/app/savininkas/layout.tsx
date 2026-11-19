import { Shell } from "@/components/shell";
import { requireOwner } from "@/lib/auth";
import { EnablePush } from "@/components/enable-push";

export default async function L({ children }: { children: React.ReactNode }) {
  const p = await requireOwner();
  return (
    <Shell title="Išsiskyrusiems · savininkas" name={p.full_name || p.email || ""}
      tabs={[["/savininkas", "Kalendorius"], ["/savininkas/uzsakymai", "Ilgalaikiai užsakymai"], ["/savininkas/sutartys", "Sutartys"], ["/savininkas/klientai", "Klientai ir vaikai"], ["/savininkas/saskaitos", "Sąskaitos ir pajamos"], ["/savininkas/nustatymai", "Kainos ir nustatymai"]]}>
      <EnablePush />
      {children}
    </Shell>
  );
}
