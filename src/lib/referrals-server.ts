import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { extendPlus, rewardCheck, type Party } from "./referrals";

// Ne serverio veiksmas: kviečiamas tik serveryje po el. pašto ar telefono patvirtinimo ir po claimReferral. Abu gauna 1 mėn. Plus.
export async function rewardReferral(inviteeId: string) {
  const db = supabaseAdmin();
  const { data: r } = await db.from("referrals").select("id, inviter_id, status").eq("invitee_id", inviteeId).maybeSingle();
  if (!r || r.status !== "pending") return;
  const party = async (id: string): Promise<Party & { plus_until: string | null }> => {
    const [{ data: p }, { data: u }] = await Promise.all([db.from("profiles").select("id, email, phone, plus_until").eq("id", id).single(), db.auth.admin.getUserById(id)]);
    return { id, email: p?.email ?? null, phone: p?.phone ?? null, plus_until: p?.plus_until ?? null, created_at: u.user?.created_at ?? new Date(0).toISOString(), email_confirmed: !!u.user?.email_confirmed_at, phone_confirmed: !!u.user?.phone_confirmed_at };
  };
  const [inviter, invitee] = await Promise.all([party(r.inviter_id), party(inviteeId)]);
  const month = new Date(); month.setUTCDate(1); month.setUTCHours(0, 0, 0, 0);
  const { count } = await db.from("referrals").select("id", { count: "exact", head: true }).eq("inviter_id", r.inviter_id).eq("status", "rewarded").gte("rewarded_at", month.toISOString());
  const err = rewardCheck(inviter, invitee, { inviterRewardsThisMonth: count ?? 0, inviteeAlreadyReferred: false });
  if (err === "not_confirmed") return; // dar laukiama patvirtinimo
  if (err) { await db.from("referrals").update({ status: "rejected", reject_reason: err }).eq("id", r.id); return; }
  const now = new Date();
  await Promise.all([
    db.from("profiles").update({ plus_until: extendPlus(inviter.plus_until, now) }).eq("id", inviter.id),
    db.from("profiles").update({ plus_until: extendPlus(invitee.plus_until, now) }).eq("id", invitee.id),
    db.from("referrals").update({ status: "rewarded", rewarded_at: now.toISOString() }).eq("id", r.id).eq("status", "pending"),
  ]);
}
