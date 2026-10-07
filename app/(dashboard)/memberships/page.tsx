import Link from "next/link";

import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDate } from "@/lib/format-date";
import { getCompanyPlans, MEMBERSHIP_PAGE_SIZE } from "@/lib/supabase/queries/memberships";
import { CompanyPlanControl } from "@/components/company-plan-control";
import { SearchInput } from "@/components/search-input";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-[#E4EFD4] text-[#14532D]",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  hidden: "bg-zinc-200 text-zinc-700",
};

const TIER_STYLES: Record<string, string> = {
  basic: "bg-zinc-100 text-zinc-700",
  silver: "bg-slate-200 text-slate-800",
  gold: "bg-amber-100 text-amber-800",
};

type Props = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function pageHref(page: number, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return params.size > 0 ? `/memberships?${params.toString()}` : "/memberships";
}

/**
 * Every company with its plan, 20 per page (spec 0008). The supplier pays
 * off platform and sends the screenshot on WhatsApp; the admin then sets
 * the plan here.
 */
export default async function MembershipsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const query = first(params.q).trim();
  const requestedPage = Number.parseInt(first(params.page), 10) || 1;

  const { companies, total, page, pageCount } = await getCompanyPlans(requestedPage, query);
  const start = total === 0 ? 0 : (page - 1) * MEMBERSHIP_PAGE_SIZE + 1;
  const end = (page - 1) * MEMBERSHIP_PAGE_SIZE + companies.length;

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-2">
        <SearchInput placeholder="Search companies by name..." />
        <p className="text-sm text-[#5B6B57]">
          Set a company&apos;s plan after you&apos;ve checked their payment screenshot on WhatsApp. Silver and Gold
          last one year from the day you set them.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E3E9DC] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E3E9DC] text-left text-xs text-[#5B6B57] uppercase">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Listing</th>
              <th className="px-4 py-3">Current plan</th>
              <th className="px-4 py-3">Plan ends</th>
              <th className="px-4 py-3">Buyer contacts used</th>
              <th className="px-4 py-3">Change plan</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-[#E3E9DC] last:border-0">
                <td className="px-4 py-3 font-medium text-[#1A1F1A]">
                  <Link href={`/companies/${company.id}`} className="hover:underline">
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-[#5B6B57]">
                  <div>{company.email}</div>
                  {company.whatsappNumber && <div>WhatsApp {company.whatsappNumber}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[company.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${TIER_STYLES[company.tier]}`}>
                    {company.tier}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#5B6B57]">{company.expiresAt ? formatDate(company.expiresAt) : "—"}</td>
                <td className="px-4 py-3 text-[#5B6B57]">
                  {company.contactsUsed} / {company.contactsQuota ?? "unlimited"}
                </td>
                <td className="px-4 py-3">
                  <CompanyPlanControl
                    key={`${company.id}-${company.tier}`}
                    companyId={company.id}
                    companyName={company.name}
                    tier={company.tier}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && (
          <p className="p-6 text-sm text-[#5B6B57]">
            {query ? <>No companies match &ldquo;{query}&rdquo;.</> : "No companies yet."}
          </p>
        )}
      </div>

      {total > 0 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 text-sm text-[#5B6B57]">
          <span>
            Showing {start} to {end} of {total} compan{total === 1 ? "y" : "ies"}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={pageHref(page - 1, query)} className="rounded-full border border-[#E3E9DC] bg-white px-3 py-1.5 hover:bg-[#F4F7F0]">
                Previous
              </Link>
            ) : (
              <span className="rounded-full border border-[#E3E9DC] px-3 py-1.5 opacity-50">Previous</span>
            )}
            <span>
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={pageHref(page + 1, query)} className="rounded-full border border-[#E3E9DC] bg-white px-3 py-1.5 hover:bg-[#F4F7F0]">
                Next
              </Link>
            ) : (
              <span className="rounded-full border border-[#E3E9DC] px-3 py-1.5 opacity-50">Next</span>
            )}
          </div>
        </nav>
      )}
    </main>
  );
}
