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

export type ProductListItem = {
  id: string;
  name: string;
  imageUrl: string;
  categoryName: string | null;
  status: string;
  createdAt: string;
  company: { id: string; name: string; status: string } | null;
};

/** The cap on the Products page's full list; plenty for this directory, and named so the page can say when it's reached. */
export const PRODUCT_LIST_LIMIT = 1000;

/**
 * Every product in any status with its company, most recent first: the
 * Products page's company grouped list. Uses `supabaseAdmin` for the same
 * reason as getPendingProducts (non approved rows are invisible to RLS).
 */
export async function getAllProducts(): Promise<ProductListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, image_url, status, created_at, categories(name), companies(id, name, status)")
    .order("created_at", { ascending: false })
    .limit(PRODUCT_LIST_LIMIT);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    categoryName: row.categories?.name ?? null,
    status: row.status,
    createdAt: row.created_at,
    company: row.companies ? { id: row.companies.id, name: row.companies.name, status: row.companies.status } : null,
  }));
}

export type ProductForEdit = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  imageUrls: string[];
  status: string;
  company: { id: string; name: string } | null;
};

/** One product, any status, for the admin's edit page; null for a missing or malformed id. */
export async function getProductForEdit(id: string): Promise<ProductForEdit | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, description, category_id, image_url, gallery_urls, status, companies(id, name)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    categoryId: data.category_id,
    imageUrls: data.gallery_urls.length > 0 ? data.gallery_urls : [data.image_url],
    status: data.status,
    company: data.companies ? { id: data.companies.id, name: data.companies.name } : null,
  };
}
