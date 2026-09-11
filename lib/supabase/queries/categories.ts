import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
  createdAt: string;
};

/** Every category with its live product count, most recently created first. */
export async function getCategories(): Promise<CategoryListItem[]> {
  const [{ data: categories, error: categoriesError }, { data: counts, error: countsError }] = await Promise.all([
    supabaseAdmin
      .from("categories")
      .select("id, name, slug, image_url, created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("category_product_counts").select("category_id, product_count"),
  ]);

  if (categoriesError) throw categoriesError;
  if (countsError) throw countsError;

  const countByCategory = new Map<string, number>();
  for (const row of counts ?? []) {
    if (row.category_id) countByCategory.set(row.category_id, row.product_count ?? 0);
  }

  return (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.image_url,
    productCount: countByCategory.get(category.id) ?? 0,
    createdAt: category.created_at,
  }));
}
