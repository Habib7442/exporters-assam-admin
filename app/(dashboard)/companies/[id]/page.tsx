import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDate } from "@/lib/format-date";
import { getCompanyById } from "@/lib/supabase/queries/companies";
import { getProductsByCompany } from "@/lib/supabase/queries/products";
import { CompanyDetailActions } from "@/components/company-detail-actions";
import { ListingControls } from "@/components/listing-controls";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-[#E4EFD4] text-[#14532D]",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  hidden: "bg-zinc-200 text-zinc-700",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompanyDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const company = await getCompanyById(id);
  if (!company) notFound();

  const products = await getProductsByCompany(id);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <Link href="/companies" className="text-xs font-medium text-[#5B6B57] hover:underline">
          &larr; All companies
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold text-[#1A1F1A]">{company.name}</h2>
          {company.verified && <span title="Verified">✅</span>}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[company.status] ?? "bg-zinc-100 text-zinc-700"}`}
          >
            {company.status}
          </span>
        </div>
      </div>

      {company.status === "pending" && <CompanyDetailActions companyId={company.id} />}

      {/* Hide hides the company and all its products from the public site; the storefront shows changes within 5 minutes. */}
      <div className="flex flex-col gap-2 rounded-xl border border-[#E3E9DC] bg-white p-4">
        <span className="text-xs uppercase text-[#5B6B57]">Manage listing</span>
        <ListingControls kind="company" id={company.id} name={company.name} status={company.status} />
      </div>

      <div className="grid gap-4 rounded-xl border border-[#E3E9DC] bg-white p-5 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs uppercase text-[#5B6B57]">Address</span>
          <span className="text-[#1A1F1A]">{company.addressLine ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">City</span>
          <span className="text-[#1A1F1A]">{company.location ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">State</span>
          <span className="text-[#1A1F1A]">{company.state ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">PIN code</span>
          <span className="text-[#1A1F1A]">{company.postalCode ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">Country</span>
          <span className="text-[#1A1F1A]">{company.country}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">Email</span>
          <span className="text-[#1A1F1A]">{company.email}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">WhatsApp</span>
          <span className="text-[#1A1F1A]">{company.whatsappNumber ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">GST number</span>
          <span className="text-[#1A1F1A]">{company.gstNumber ?? "—"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase text-[#5B6B57]">Submitted</span>
          <span className="text-[#1A1F1A]">{formatDate(company.createdAt)}</span>
        </div>
        {company.about && (
          <div className="flex flex-col gap-1 sm:col-span-2">
            <span className="text-xs uppercase text-[#5B6B57]">About</span>
            <span className="text-[#1A1F1A]">{company.about}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm text-[#5B6B57]">
          {products.length === 0
            ? "No products from this company yet."
            : `${products.length} product${products.length === 1 ? "" : "s"}.`}
        </p>

        {products.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[#E3E9DC] bg-white">
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
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-[#E3E9DC] last:border-0">
                    <td className="flex items-center gap-3 px-4 py-3 font-medium text-[#1A1F1A]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- internal tool, no image config needed for a plain preview */}
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="size-9 shrink-0 rounded-lg object-cover"
                      />
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
        )}
      </div>
    </main>
  );
}
