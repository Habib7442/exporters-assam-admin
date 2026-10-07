import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const MEMBERSHIP_PAGE_SIZE = 20;

export type CompanyPlan = {
  id: string;
  name: string;
  status: string;
  email: string;
  whatsappNumber: string | null;
  /** The active paid plan, or "basic" when there is none (or it has expired). */
  tier: "basic" | "silver" | "gold";
  expiresAt: string | null;
  /** Buyer contacts unlocked this plan year (storefront spec 0009). */
  contactsUsed: number;
  /** null means unlimited (Gold). */
  contactsQuota: number | null;
};

export type CompanyPlanPage = {
  companies: CompanyPlan[];
  total: number;
  page: number;
  pageCount: number;
};

/** Escapes `%`, `_` and `\` so a search term is matched literally by ilike. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * One page of every company with its current plan, alphabetical, for the
 * Memberships page (spec 0008). The admin upgrades a company here after
 * checking its payment screenshot on WhatsApp. Counts first so an out of
 * range `page` (for example after a search narrows the list) is clamped to
 * the last page instead of asking PostgREST for rows that don't exist.
 */
export async function getCompanyPlans(page: number, query: string): Promise<CompanyPlanPage> {
  const nameFilter = query ? `%${escapeLike(query)}%` : null;

  let countQuery = supabaseAdmin.from("companies").select("id", { count: "exact", head: true });
  if (nameFilter) countQuery = countQuery.ilike("name", nameFilter);
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / MEMBERSHIP_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), pageCount);
  if (total === 0) return { companies: [], total, page: currentPage, pageCount };

  const from = (currentPage - 1) * MEMBERSHIP_PAGE_SIZE;
  let rowsQuery = supabaseAdmin
    .from("companies")
    .select("id, name, status, email, company_contacts(whatsapp_number), memberships(tier, status, expires_at)")
    .eq("memberships.status", "active")
    .order("name", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + MEMBERSHIP_PAGE_SIZE - 1);
  if (nameFilter) rowsQuery = rowsQuery.ilike("name", nameFilter);

  const { data, error } = await rowsQuery;
  if (error) throw error;

  // The limits live in one database function, shared with the storefront.
  const ids = (data ?? []).map((row) => row.id);
  const { data: allowances, error: allowanceError } = await supabaseAdmin.rpc("contact_allowances", { p_company_ids: ids });
  if (allowanceError) throw allowanceError;
  const allowanceById = new Map((allowances ?? []).map((row) => [row.company_id, row]));

  const now = Date.now();
  const companies = (data ?? []).map((row): CompanyPlan => {
    const active = row.memberships.find((m) => !m.expires_at || new Date(m.expires_at).getTime() > now);
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      email: row.email,
      whatsappNumber: row.company_contacts?.whatsapp_number ?? null,
      tier: (active?.tier as "silver" | "gold" | undefined) ?? "basic",
      expiresAt: active?.expires_at ?? null,
      contactsUsed: allowanceById.get(row.id)?.used ?? 0,
      contactsQuota: allowanceById.get(row.id)?.quota ?? null,
    };
  });

  return { companies, total, page: currentPage, pageCount };
}
