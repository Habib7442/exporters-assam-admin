"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refreshStorefront } from "@/lib/storefront";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIERS = ["basic", "silver", "gold"];

export type SetCompanyPlanResult = { ok: true } | { ok: false; message: string };

/**
 * Sets a company's plan after the admin has checked its payment screenshot
 * on WhatsApp (spec 0008). Silver and Gold start a one year plan from
 * today; Basic ends the paid plan. `set_company_plan` does the switch in
 * one transaction, so the public tier never shows two plans.
 */
export async function setCompanyPlan(companyId: string, tier: string): Promise<SetCompanyPlanResult> {
  await requireAdmin();

  if (!UUID_RE.test(companyId) || !TIERS.includes(tier)) return { ok: false, message: "Invalid company or plan." };

  const { error } = await supabaseAdmin.rpc("set_company_plan", { p_company_id: companyId, p_tier: tier });
  if (error?.code === "P0004") return { ok: false, message: "This company no longer exists." };
  if (error) return { ok: false, message: "Something went wrong. Please try again." };

  revalidatePath("/memberships");
  revalidatePath(`/companies/${companyId}`);
  await refreshStorefront();
  return { ok: true };
}
