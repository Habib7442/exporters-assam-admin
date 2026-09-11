import { requireAdmin } from "@/lib/auth/require-admin";
import { getCategories } from "@/lib/supabase/queries/categories";
import { CategoryManager } from "@/components/category-manager";

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await getCategories();

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-sm text-zinc-500">{categories.length} categories.</p>
      <CategoryManager categories={categories} />
    </main>
  );
}
