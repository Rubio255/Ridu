"use client";
import { useState } from "react";
import { addPassenger } from "@/app/actions";

// Suaugusį keleivį klientas prideda pats: save arba kitą žmogų. Sveikatos ar judumo duomenys nerenkami.
export function PassengerForm({ myName }: { myName: string }) {
  const [who, setWho] = useState<"self" | "other">("self"), [drop, setDrop] = useState("alone");
  return (
    <form action={addPassenger} className="grid gap-3 border-t border-[var(--line)] pt-3">
      <h3 className="font-bold">Pridėti suaugusį keleivį</h3>
      <label className="grid gap-1 text-sm font-semibold muted">Kas važiuos
        <select name="who" className="input" value={who} onChange={(e) => setWho(e.target.value as "self" | "other")}><option value="self">Aš pats</option><option value="other">Kitas suaugęs</option></select></label>
      <label className="grid gap-1 text-sm font-semibold muted">Vardas<input name="first_name" required className="input" key={who} defaultValue={who === "self" ? myName : ""} /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="senior" />Vyresnio amžiaus: palydėti iki durų ir padėti įlipti</label>
      {who === "other" && (
        <>
          <label className="grid gap-1 text-sm font-semibold muted">Atvykus
            <select name="dropoff" className="input" value={drop} onChange={(e) => setDrop(e.target.value)}><option value="alone">Išlipa pats</option><option value="handover">Palydėti ir perduoti asmeniui</option></select></label>
          {drop === "handover" && <label className="grid gap-1 text-sm font-semibold muted">Kam perduoti<input name="handover_to" className="input" placeholder="Pvz. dukrai arba registratūroje" /></label>}
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" name="consent" required className="mt-1 h-5 w-5 flex-none" /><span>Patvirtinu, kad keleivis sutinka būti vežamas ir jo duomenis pateikiu su jo žinia <span className="text-xs text-[var(--bad)]">privaloma</span></span></label>
        </>
      )}
      <label className="grid gap-1 text-sm font-semibold muted">Pastabos vairuotojui (be sveikatos duomenų)<input name="notes" className="input" placeholder="Pvz. laukti prie laiptinės" /></label>
      <button className="btn btn-primary">Pridėti keleivį</button>
    </form>
  );
}
