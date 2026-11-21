import "server-only";
import { supabaseAdmin } from "./supabase/server";

// Klientui rodoma tik tai, ko reikia kelionei: vairuotojo vardas, automobilis, numeris ir telefonas
export type DriverCard = { id: string; name: string; car: string | null; plate: string | null; phone: string | null; childSeats: boolean; verified: boolean };

export async function driverCards(ids: (string | null | undefined)[]): Promise<Map<string, DriverCard>> {
  const list = [...new Set(ids.filter(Boolean) as string[])];
  if (!list.length) return new Map();
  const { data } = await supabaseAdmin().from("drivers")
    .select("profile_id, car, plate, child_seats, profile:profiles(full_name, phone), docs:driver_documents(valid_until)").in("profile_id", list);
  const today = new Date().toISOString().slice(0, 10);
  return new Map((data ?? []).map((d) => {
    const p = d.profile as unknown as { full_name: string; phone: string | null } | null;
    const docs = (d.docs ?? []) as { valid_until: string | null }[];
    return [d.profile_id, { id: d.profile_id, name: p?.full_name ?? "Vairuotojas", car: d.car, plate: d.plate, phone: p?.phone ?? null, childSeats: d.child_seats,
      verified: docs.length > 0 && docs.every((x) => !x.valid_until || x.valid_until >= today) }];
  }));
}

export const initials = (n: string) => n.split(/\s+/).map((x) => x[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
export const firstName = (n: string | null | undefined) => (n ?? "").split(" ")[0];
