import { requireAdmin } from "@/lib/auth/require-admin";
import { getPendingProducts } from "@/lib/supabase/queries/products";
import { PendingProductCard } from "@/components/pending-product-card";

export default async function ProductsPage() {
  await requireAdmin();
  const pendingProducts = await getPendingProducts();

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-sm text-zinc-500">
        {pendingProducts.length === 0
          ? "Nothing waiting for review."
          : `${pendingProducts.length} product${pendingProducts.length === 1 ? "" : "s"} awaiting review.`}
      </p>

      <div className="flex flex-col gap-3">
        {pendingProducts.map((product) => (
          <PendingProductCard key={product.id} {...product} />
        ))}
      </div>
    </main>
  );
}
