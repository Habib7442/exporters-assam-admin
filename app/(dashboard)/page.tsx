import Link from "next/link";
import { Building2, ClipboardList, MessageSquare, Package } from "lucide-react";

import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDateTime } from "@/lib/format-date";
import { getPendingCompanies } from "@/lib/supabase/queries/companies";
import { getPendingProducts } from "@/lib/supabase/queries/products";
import { getRecentEnquiries } from "@/lib/supabase/queries/enquiries";
import { getDashboardStats } from "@/lib/supabase/queries/dashboard";
import { PendingCompanyCard } from "@/components/pending-company-card";
import { PendingProductCard } from "@/components/pending-product-card";

const RECENT_ENQUIRIES_LIMIT = 5;

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-xl border border-[#E3E9DC] bg-white p-4 transition-shadow hover:shadow-sm"
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-[#E4EFD4] text-[#14532D]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="text-2xl font-semibold text-[#1A1F1A]">{value}</span>
      <span className="text-xs text-[#5B6B57]">{label}</span>
    </Link>
  );
}

export default async function DashboardPage() {
  await requireAdmin();

  const [stats, pendingCompanies, pendingProducts, enquiries] = await Promise.all([
    getDashboardStats(),
    getPendingCompanies(),
    getPendingProducts(),
    getRecentEnquiries(),
  ]);

  const recentEnquiries = enquiries.slice(0, RECENT_ENQUIRIES_LIMIT);

  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Companies" value={stats.totalCompanies} icon={Building2} href="/companies" />
        <StatCard label="Pending companies" value={stats.pendingCompanies} icon={Building2} href="/companies" />
        <StatCard label="Products" value={stats.totalProducts} icon={Package} href="/products" />
        <StatCard label="Pending products" value={stats.pendingProducts} icon={Package} href="/products" />
        <StatCard label="Enquiries" value={stats.totalEnquiries} icon={MessageSquare} href="/enquiries" />
        <StatCard
          label="Buy requirements"
          value={stats.totalBuyRequirements}
          icon={ClipboardList}
          href="/buy-requirements"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#1A1F1A]">
          {pendingCompanies.length === 0 && pendingProducts.length === 0
            ? "Nothing waiting for review"
            : "Needs your review"}
        </h2>

        {pendingCompanies.length === 0 && pendingProducts.length === 0 ? (
          <p className="rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm text-[#5B6B57]">
            No business listings or products are pending approval right now.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingCompanies.map((company) => (
              <PendingCompanyCard key={company.id} {...company} />
            ))}
            {pendingProducts.map((product) => (
              <PendingProductCard key={product.id} {...product} />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1A1F1A]">Recent enquiries</h2>
          <Link href="/enquiries" className="text-xs font-medium text-[#2E7D32] hover:underline">
            View all &rarr;
          </Link>
        </div>

        {recentEnquiries.length === 0 ? (
          <p className="rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm text-[#5B6B57]">No enquiries yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="rounded-xl border border-[#E3E9DC] bg-white p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-[#1A1F1A]">
                    {enquiry.productName ?? enquiry.companyName ?? "General enquiry"}
                  </span>
                  <span className="text-xs text-[#5B6B57]">{formatDateTime(enquiry.createdAt)}</span>
                </div>
                <p className="mt-1 text-[#5B6B57]">
                  {enquiry.contactName} · {enquiry.buyerPhone}
                  {enquiry.contactEmail ? ` · ${enquiry.contactEmail}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
