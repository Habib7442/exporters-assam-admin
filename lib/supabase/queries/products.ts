import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PendingProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  galleryUrls: string[];
  categoryName: string | null;
  companyName: string;
  createdAt: string;
};

/**
 * Every product awaiting review, oldest first. Uses `supabaseAdmin`: a
 * `pending` row is invisible to the storefront's public `status =
 * 'approved'` RLS policy, and this is the one app that must see it.
 */
export async function getPendingProducts(): Promise<PendingProduct[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "id, name, slug, description, image_url, gallery_urls, created_at, categories(name), companies(name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    galleryUrls: row.gallery_urls,
    categoryName: row.categories?.name ?? null,
    companyName: row.companies?.name ?? "Unknown company",
    createdAt: row.created_at,
  }));
}

export type CompanyProduct = {
  id: string;
  name: string;
  imageUrl: string;
  categoryName: string | null;
  status: string;
  createdAt: string;
};

/** Every product belonging to one company, any status, most recent first. */
export async function getProductsByCompany(companyId: string): Promise<CompanyProduct[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, image_url, status, created_at, categories(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    categoryName: row.categories?.name ?? null,
    status: row.status,
    createdAt: row.created_at,
  }));
}
