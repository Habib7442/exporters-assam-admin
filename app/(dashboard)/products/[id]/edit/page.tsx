import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getCategories } from "@/lib/supabase/queries/categories";
import { getProductForEdit } from "@/lib/supabase/queries/products";
import { AdminProductForm } from "@/components/admin-product-form";

type Props = {
  params: Promise<{ id: string }>;
};

/** Edit any product's details and photos; its status stays as it is. */
export default async function EditProductPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [product, categories] = await Promise.all([getProductForEdit(id), getCategories()]);
  if (!product || !product.company) notFound();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <Link href={`/companies/${product.company.id}`} className="text-xs font-medium text-[#5B6B57] hover:underline">
          &larr; {product.company.name}
        </Link>
        <h2 className="text-xl font-semibold text-[#1A1F1A]">Edit {product.name}</h2>
        <p className="text-sm text-[#5B6B57]">
          Saving keeps the product&apos;s status ({product.status}). Use Hide on the product list to take it off the site.
        </p>
      </div>

      <AdminProductForm
        companyId={product.company.id}
        companyName={product.company.name}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          imageUrls: product.imageUrls,
        }}
      />
    </main>
  );
}
