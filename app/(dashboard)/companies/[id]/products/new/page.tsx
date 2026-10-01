import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { getCategories } from "@/lib/supabase/queries/categories";
import { getCompanyById } from "@/lib/supabase/queries/companies";
import { AdminProductForm } from "@/components/admin-product-form";

type Props = {
  params: Promise<{ id: string }>;
};

/** An admin adds a product to this company; it goes live immediately (PRD Section 4). */
export default async function NewCompanyProductPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const company = await getCompanyById(id);
  if (!company) notFound();

  const categories = company.status === "approved" ? await getCategories() : [];

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <Link href={`/companies/${company.id}`} className="text-xs font-medium text-[#5B6B57] hover:underline">
          &larr; {company.name}
        </Link>
        <h2 className="text-xl font-semibold text-[#1A1F1A]">Add a product to {company.name}</h2>
        <p className="text-sm text-[#5B6B57]">Products you add go live immediately, with no review step.</p>
      </div>

      {company.status !== "approved" ? (
        <p className="rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm text-[#5B6B57]">
          Products can only be added to an approved company. This company is {company.status}.
        </p>
      ) : categories.length === 0 ? (
        <p className="rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm text-[#5B6B57]">
          Add a category first:{" "}
          <Link href="/categories" className="underline">
            Categories
          </Link>
          .
        </p>
      ) : (
        <AdminProductForm
          companyId={company.id}
          companyName={company.name}
          categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        />
      )}
    </main>
  );
}
