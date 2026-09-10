import { requireAdmin } from "@/lib/auth/require-admin";
import { getPendingCompanies } from "@/lib/supabase/queries/companies";
import { PendingCompanyCard } from "@/components/pending-company-card";

export default async function Home() {
  await requireAdmin();
  const pendingCompanies = await getPendingCompanies();

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-sm text-[#5B6B57]">
        {pendingCompanies.length === 0
          ? "Nothing waiting for review."
          : `${pendingCompanies.length} business listing${pendingCompanies.length === 1 ? "" : "s"} awaiting review.`}
      </p>

      <div className="flex flex-col gap-3">
        {pendingCompanies.map((company) => (
          <PendingCompanyCard key={company.id} {...company} />
        ))}
      </div>
    </main>
  );
}
