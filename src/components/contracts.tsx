import Link from "next/link";
import { decideSubscription } from "@/app/actions";
import { DAYS, eur } from "@/lib/time";

export type ContractRow = {
  id: string; status: string; weekdays: number[]; period: string; pickup_time: string; months: number;
  monthly_eur: number; starts_on: string; ends_on: string | null; payer_id: string;
  child: { first_name: string }; payer: { full_name: string | null; email: string | null; contract_no: string | null } | null;
  from: { label: string }; to: { label: string };
};

export const FILTERS = [["aktyvios", "Galiojančios"], ["pasibaigusios", "Pasibaigusios"], ["visos", "Visos"]] as const;
export type Filter = (typeof FILTERS)[number][0];
export const toFilter = (v?: string): Filter => (FILTERS.some(([k]) => k === v) ? (v as Filter) : "aktyvios");

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("lt-LT", { year: "numeric", month: "long", day: "numeric" });
function plannedEnd(x: ContractRow) {
  if (x.ends_on) return x.ends_on;
  if (x.months <= 1) return null;
  const d = new Date(`${x.starts_on}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() + x.months);
  return d.toISOString().slice(0, 10);
}

// Galiojančių ir pasibaigusių sutarčių sąrašas. Klientams rodoma tik galutinė kaina.
export function Contracts({ rows, filter, base, owner, me, canEnd = owner, label, fee = 0 }: { rows: ContractRow[]; filter: Filter; base: string; owner: boolean; me?: string; canEnd?: boolean; label?: string; fee?: number }) {
  const active = rows.filter((x) => x.status === "active"), ended = rows.filter((x) => x.status === "ended");
  const shown = filter === "visos" ? rows : filter === "aktyvios" ? active : ended;
  const monthly = active.filter((x) => owner || x.payer_id === me).reduce((a, x) => a + Number(x.monthly_eur), 0) + fee;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[["Galiojančios sutartys", String(active.length)], [label ?? (owner ? "Mėnesio pajamos" : "Mokate per mėnesį"), eur(monthly)], ["Pasibaigusios", String(ended.length)]].map(([l, v]) => (
          <div key={l} className="rounded-xl bg-[var(--surface-2)] p-3"><div className="text-sm muted">{l}</div><div className="num text-lg font-bold">{v}</div>{fee > 0 && l === "Mokate per mėnesį" && <div className="text-sm muted">su platformos mokesčiu {eur(fee)}</div>}</div>
        ))}
      </div>
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Sutartys</h2>
          <nav className="flex flex-wrap gap-2" aria-label="Rodyti sutartis">
            {FILTERS.map(([k, l]) => <Link key={k} href={`${base}?rodyti=${k}`} className={`btn ${filter === k ? "btn-primary" : ""}`} aria-current={filter === k ? "page" : undefined}>{l}</Link>)}
          </nav>
        </div>
        {shown.length === 0 && <div className="muted">{filter === "pasibaigusios" ? "Pasibaigusių sutarčių nėra." : "Sutarčių nėra."}</div>}
        {shown.map((x) => {
          const end = plannedEnd(x), payer = x.payer?.full_name || x.payer?.email || "";
          return (
            <div key={x.id} className="grid gap-1 border-t border-[var(--line)] pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{x.payer?.contract_no ? `${x.payer.contract_no} · ` : ""}{x.child.first_name} · {x.weekdays.map((w) => DAYS[w - 1]).join(", ")} · {x.period === "am" ? "rytas" : String(x.pickup_time).slice(0, 5)}</b>
                <span className={`pill ${x.status === "active" ? "p-ok" : "p-bad"}`}>{x.status === "active" ? "Galioja" : "Pasibaigusi"}</span>
              </div>
              <div className="text-sm muted">{owner ? `${payer} · ` : x.payer_id !== me ? `Moka ${payer || "kitas globėjas"} · ` : ""}{x.from.label} → {x.to.label}</div>
              <div className="text-sm"><b className="num">{eur(x.monthly_eur)} / mėn.</b> · {x.months > 1 ? `${x.months} mėn.` : "Kas mėnesį pratęsiama"} · {end ? `${fmt(x.starts_on)} – ${fmt(end)}` : `nuo ${fmt(x.starts_on)}, neterminuota`}</div>
              {canEnd && x.status === "active" && (
                <form action={decideSubscription}><input type="hidden" name="id" value={x.id} /><input type="hidden" name="decision" value="ended" /><button className="btn btn-bad">Nutraukti sutartį</button></form>
              )}
            </div>
          );
        })}
        <p className="text-sm muted">{canEnd ? "Nutraukus sutartį, būsimos jos kelionės atšaukiamos ir tėvams išsiunčiamas pranešimas." : owner ? "Sutartis sudaro ir nutraukia MB." : "Norėdami nutraukti sutartį, susisiekite su vairuotoju."}</p>
      </section>
    </>
  );
}

export const CONTRACT_SELECT = "id, status, weekdays, period, pickup_time, months, monthly_eur, starts_on, ends_on, payer_id, child:children(first_name), payer:profiles(full_name, email, contract_no), from:places!subscriptions_from_place_id_fkey(label), to:places!subscriptions_to_place_id_fkey(label)";
