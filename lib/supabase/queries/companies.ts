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
  gstNumber: string | null;
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
      "id, name, slug, location, country, logo_url, about, email, gst_number, created_at, company_contacts(whatsapp_number)",
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
    gstNumber: row.gst_number,
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

export type CompanyDetail = {
  id: string;
  name: string;
  addressLine: string | null;
  location: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  logoUrl: string | null;
  about: string | null;
  email: string;
  gstNumber: string | null;
  whatsappNumber: string | null;
  status: string;
  verified: boolean;
  createdAt: string;
};

/** One company by id, any status — the Companies detail page. */
export async function getCompanyById(id: string): Promise<CompanyDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select(
      "id, name, address_line, location, state, postal_code, country, logo_url, about, email, gst_number, status, verified, created_at, company_contacts(whatsapp_number)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    addressLine: data.address_line,
    location: data.location,
    state: data.state,
    postalCode: data.postal_code,
    country: data.country,
    logoUrl: data.logo_url,
    about: data.about,
    email: data.email,
    gstNumber: data.gst_number,
    whatsappNumber: data.company_contacts?.whatsapp_number ?? null,
    status: data.status,
    verified: data.verified,
    createdAt: data.created_at,
  };
}
