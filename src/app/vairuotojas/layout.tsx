import { Shell } from "@/components/shell";
import { requireDriver } from "@/lib/auth";
import { EnablePush } from "@/components/enable-push";

export default async function L({ children }: { children: React.ReactNode }) {
  const p = await requireDriver();
  return (
    <Shell title="Ridu · vairuotojas" name={p.full_name || p.email || ""}
      tabs={[["/vairuotojas", "Mano kalendorius"], ["/vairuotojas/sutartys", "Sutartys"], ["/vairuotojas/uzdarbis", "Uždarbis"], ["/vairuotojas/duomenys", "Mano duomenys"]]}>
      <EnablePush who="driver" />
      {children}
    </Shell>
  );
}
