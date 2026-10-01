"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Moderation for public buy requirements, which anyone can post without an
 * account. Two actions only:
 *  - take off the site: is_public true -> false. Every public read path
 *    (RLS policy, the storefront lists, search) requires is_public, so the
 *    post disappears at once.
 *  - delete permanently. Enquiries that replied to it keep their row with
 *    buy_requirement_id set to null (`on delete set null`).
 * There is deliberately no "make public": a buyer can choose to keep a
 * requirement private when posting, and nothing records whether a private
 * row was the buyer's choice or an admin take down, so publishing one could
 * expose a request its buyer wanted private.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ModerationResult = { ok: true } | { ok: false; message: string };

/** Takes a public buy requirement off the site. */
export async function takeDownBuyRequirement(id: string): Promise<ModerationResult> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return { ok: false, message: "Invalid id." };

  // Scoped to is_public = true, with `.select("id")` so a zero row update
  // (already taken down or deleted) isn't reported as a success.
  const { data, error } = await supabaseAdmin
    .from("buy_requirements")
    .update({ is_public: false })
    .eq("id", id)
    .eq("is_public", true)
    .select("id");

  if (error) return { ok: false, message: "Something went wrong. Please try again." };
  if (!data?.length) return { ok: false, message: "This changed since the page loaded. Refresh and try again." };

  revalidatePath("/buy-requirements");
  return { ok: true };
}

/** Permanently deletes a buy requirement, public or not. */
export async function deleteBuyRequirement(id: string): Promise<ModerationResult> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return { ok: false, message: "Invalid id." };

  const { data, error } = await supabaseAdmin.from("buy_requirements").delete().eq("id", id).select("id");

  if (error) return { ok: false, message: "Something went wrong. Please try again." };
  if (!data?.length) return { ok: false, message: "This buy requirement was already deleted." };

  revalidatePath("/buy-requirements");
  return { ok: true };
}
