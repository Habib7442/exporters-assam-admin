"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApprovalResult = { ok: true } | { ok: false; message: string };

/**
 * Approves a pending company. `requireAdmin` first — `supabaseAdmin` alone
 * enforces nothing. Also marks it `verified`: decided inline with the
 * engineer — there's no separate vetting step built yet (no document/GST
 * check), so admin approval is the only real scrutiny a listing gets today,
 * and leaving `verified` unset would just make the badge permanently empty
 * for everyone. Revisit if a future membership tier (scope feature 11)
 * repurposes "Verified" as a paid perk instead.
 */
export async function approveCompany(companyId: string): Promise<ApprovalResult> {
  await requireAdmin();

  if (!UUID_RE.test(companyId)) return { ok: false, message: "Invalid company id." };

  // Scoped to status = 'pending' so this only ever moves a company forward
  // from the state the queue actually showed it in, never re-approves an
  // already-approved row or races a second admin acting on the same one.
  const { error } = await supabaseAdmin
    .from("companies")
    .update({ status: "approved", rejection_reason: null, verified: true })
    .eq("id", companyId)
    .eq("status", "pending");

  if (error) return { ok: false, message: "Something went wrong. Please try again." };

  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}

/** Rejects a pending company with a reason the supplier will see. */
export async function rejectCompany(companyId: string, reason: string): Promise<ApprovalResult> {
  await requireAdmin();

  if (!UUID_RE.test(companyId)) return { ok: false, message: "Invalid company id." };

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { ok: false, message: "Enter a reason." };
  if (trimmedReason.length > 500) return { ok: false, message: "Reason must be under 500 characters." };

  const { error } = await supabaseAdmin
    .from("companies")
    .update({ status: "rejected", rejection_reason: trimmedReason })
    .eq("id", companyId)
    .eq("status", "pending");

  if (error) return { ok: false, message: "Something went wrong. Please try again." };

  revalidatePath("/");
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  return { ok: true };
}
