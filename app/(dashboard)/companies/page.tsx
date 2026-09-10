import { requireAdmin } from "@/lib/auth/require-admin";
import { getAllCompanies } from "@/lib/supabase/queries/companies";

const STATUS_STYLES: Record<string, string> = {
  approved: "bg-[#E4EFD4] text-[#14532D]",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
};

export default async function CompaniesPage() {
  await requireAdmin();
  const companies = await getAllCompanies();

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-sm text-[#5B6B57]">{companies.length} companies.</p>

      <div className="overflow-x-auto rounded-xl border border-[#E3E9DC] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E3E9DC] text-left text-xs text-[#5B6B57] uppercase">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-[#E3E9DC] last:border-0">
                <td className="px-4 py-3 font-medium text-[#1A1F1A]">
                  {company.name} {company.verified && <span title="Verified">✅</span>}
                </td>
                <td className="px-4 py-3 text-[#5B6B57]">{company.location ?? company.country}</td>
                <td className="px-4 py-3 text-[#5B6B57]">{company.email}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[company.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {company.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#5B6B57]">{new Date(company.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {companies.length === 0 && <p className="p-6 text-sm text-[#5B6B57]">No companies yet.</p>}
      </div>
    </main>
  );
}
