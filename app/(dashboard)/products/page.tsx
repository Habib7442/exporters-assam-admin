import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDate } from "@/lib/format-date";
import {
  getAllProducts,
  getPendingProducts,
  PRODUCT_LIST_LIMIT,
  type ProductListItem,
} from "@/lib/supabase/queries/products";
import { ListingControls } from "@/components/listing-controls";
import { PendingProductCard } from "@/components/pending-product-card";
import { SearchInput } from "@/components/search-input";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-[#E4EFD4] text-[#14532D]",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  hidden: "bg-zinc-200 text-zinc-700",
};

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

type CompanyGroup = {
  key: string;
  company: ProductListItem["company"];
  products: ProductListItem[];
};

/** Case-insensitive match on the product, its company, or its category. */
function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  return fields.some((field) => field?.toLowerCase().includes(query));
}

/** Products grouped by company, companies alphabetical, each group's products most recent first. */
function groupByCompany(products: ProductListItem[]): CompanyGroup[] {
  const groups = new Map<string, CompanyGroup>();
  for (const product of products) {
    const key = product.company?.id ?? "none";
    const group = groups.get(key) ?? { key, company: product.company, products: [] };
    group.products.push(product);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) =>
    (a.company?.name ?? "").localeCompare(b.company?.name ?? "", undefined, { sensitivity: "base" }),
  );
}

export default async function ProductsPage({ searchParams }: Props) {
  await requireAdmin();
  const rawQuery = (await searchParams).q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim().toLowerCase() ?? "";

  const [pendingProducts, allProducts] = await Promise.all([getPendingProducts(), getAllProducts()]);

  // Filtered here rather than in SQL: one search across the product, its
  // company and its category, over a list capped at PRODUCT_LIST_LIMIT,
  // which this directory is far from reaching.
  const visiblePending = query
    ? pendingProducts.filter((product) => matches(query, product.name, product.companyName, product.categoryName))
    : pendingProducts;
  const visibleProducts = query
    ? allProducts.filter((product) => matches(query, product.name, product.company?.name, product.categoryName))
    : allProducts;
  const groups = groupByCompany(visibleProducts);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <SearchInput placeholder="Search products, companies or categories..." />
        {query && (
          <p className="text-sm text-[#5B6B57]">
            {visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"} matching &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#1A1F1A]">Awaiting review</h2>
        <p className="text-sm text-zinc-500">
          {visiblePending.length === 0
            ? query
              ? "No products awaiting review match this search."
              : "Nothing waiting for review."
            : `${visiblePending.length} product${visiblePending.length === 1 ? "" : "s"} awaiting review.`}
        </p>
        <div className="flex flex-col gap-3">
          {visiblePending.map((product) => (
            <PendingProductCard key={product.id} {...product} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#1A1F1A]">All products by company</h2>
        <p className="text-sm text-[#5B6B57]">
          {allProducts.length === 0
            ? "No products yet."
            : `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"} across ${groups.length} compan${groups.length === 1 ? "y" : "ies"}.`}
          {allProducts.length >= PRODUCT_LIST_LIMIT && ` Showing the newest ${PRODUCT_LIST_LIMIT}.`}
        </p>

        {query && visibleProducts.length === 0 && allProducts.length > 0 && (
          <p className="rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm text-[#5B6B57]">
            No products match &ldquo;{query}&rdquo;.
          </p>
        )}

        {groups.map((group) => (
          <div key={group.key} className="overflow-x-auto rounded-xl border border-[#E3E9DC] bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-[#E3E9DC] px-4 py-3">
              {group.company ? (
                <Link href={`/companies/${group.company.id}`} className="font-semibold text-[#1A1F1A] hover:underline">
                  {group.company.name}
                </Link>
              ) : (
                <span className="font-semibold text-[#1A1F1A]">Unknown company</span>
              )}
              {group.company && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[group.company.status] ?? "bg-zinc-100 text-zinc-700"}`}
                >
                  {group.company.status}
                </span>
              )}
              <span className="text-xs text-[#5B6B57]">
                {group.products.length} product{group.products.length === 1 ? "" : "s"}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E3E9DC] text-left text-xs text-[#5B6B57] uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.products.map((product) => (
                  <tr key={product.id} className="border-b border-[#E3E9DC] last:border-0">
                    <td className="flex items-center gap-3 px-4 py-3 font-medium text-[#1A1F1A]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- internal tool, no image config needed for a plain preview */}
                      <img src={product.imageUrl} alt={product.name} className="size-9 shrink-0 rounded-lg object-cover" />
                      {product.name}
                    </td>
                    <td className="px-4 py-3 text-[#5B6B57]">{product.categoryName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[product.status] ?? "bg-zinc-100 text-zinc-700"}`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#5B6B57]">{formatDate(product.createdAt)}</td>
                    <td className="px-4 py-3">
                      <ListingControls kind="product" id={product.id} name={product.name} status={product.status} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </main>
  );
}
