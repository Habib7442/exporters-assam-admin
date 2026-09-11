"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApprovalResult = { ok: true } | { ok: false; message: string };

/** Approves a pending product. `requireAdmin` first — `supabaseAdmin` alone enforces nothing. */
export async function approveProduct(productId: string): Promise<ApprovalResult> {
  await requireAdmin();

  if (!UUID_RE.test(productId)) return { ok: false, message: "Invalid product id." };

  // Scoped to status = 'pending', same reasoning as approveCompany: only
  // ever moves a product forward from the state the queue actually showed
  // it in, never re-approves an already-approved row. `.select("id")`
  // matters here: without it, an update that matches zero rows (a second
  // admin already acted on this one) still returns error: null, so the
  // caller would otherwise get a false { ok: true } while the database
  // stayed untouched.
  const { data, error } = await supabaseAdmin
    .from("products")
    .update({ status: "approved", rejection_reason: null })
    .eq("id", productId)
    .eq("status", "pending")
    .select("id");

  if (error) return { ok: false, message: "Something went wrong. Please try again." };
  if (!data?.length) return { ok: false, message: "This product was already reviewed by someone else." };

  revalidatePath("/products");
  revalidatePath("/");
  return { ok: true };
}

/** Rejects a pending product with a reason the supplier will see. */
export async function rejectProduct(productId: string, reason: string): Promise<ApprovalResult> {
  await requireAdmin();

  if (!UUID_RE.test(productId)) return { ok: false, message: "Invalid product id." };

  const trimmedReason = reason.trim();
  if (!trimmedReason) return { ok: false, message: "Enter a reason." };
  if (trimmedReason.length > 500) return { ok: false, message: "Reason must be under 500 characters." };

  const { data, error } = await supabaseAdmin
    .from("products")
    .update({ status: "rejected", rejection_reason: trimmedReason })
    .eq("id", productId)
    .eq("status", "pending")
    .select("id");

  if (error) return { ok: false, message: "Something went wrong. Please try again." };
  if (!data?.length) return { ok: false, message: "This product was already reviewed by someone else." };

  revalidatePath("/products");
  revalidatePath("/");
  return { ok: true };
}
