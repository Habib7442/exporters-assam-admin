import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PendingCompany = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  country: string;
  logoUrl: string | null;
  about: string | null;
  email: string;
  whatsappNumber: string | null;
  createdAt: string;
};

/**
 * Every company awaiting review, oldest first (a review queue is worked in
 * submission order). Uses `supabaseAdmin`: a `pending` row is invisible to
 * the storefront's public `status = 'approved'` RLS policy, and this is the
 * one app that must see it.
 */
export async function getPendingCompanies(): Promise<PendingCompany[]> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select(
      "id, name, slug, location, country, logo_url, about, email, created_at, company_contacts(whatsapp_number)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    location: row.location,
    country: row.country,
    logoUrl: row.logo_url,
    about: row.about,
    email: row.email,
    whatsappNumber: row.company_contacts?.whatsapp_number ?? null,
    createdAt: row.created_at,
  }));
}

export type CompanyListItem = {
  id: string;
  name: string;
  location: string | null;
  country: string;
  email: string;
  status: string;
  verified: boolean;
  createdAt: string;
};

/** Every company, any status, most recent first — the Companies nav page. */
export async function getAllCompanies(): Promise<CompanyListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, name, location, country, email, status, verified, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    location: row.location,
    country: row.country,
    email: row.email,
    status: row.status,
    verified: row.verified,
    createdAt: row.created_at,
  }));
}
