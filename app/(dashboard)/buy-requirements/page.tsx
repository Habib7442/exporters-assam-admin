import { requireAdmin } from "@/lib/auth/require-admin";
import { getRecentBuyRequirements } from "@/lib/supabase/queries/buy-requirements";

export default async function BuyRequirementsPage() {
  await requireAdmin();
  const buyRequirements = await getRecentBuyRequirements();

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-sm text-[#5B6B57]">{buyRequirements.length} buy requirements.</p>

      <div className="flex flex-col gap-3">
        {buyRequirements.map((requirement) => (
          <div key={requirement.id} className="rounded-xl border border-[#E3E9DC] bg-white p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-[#1A1F1A]">
                {requirement.productText} · {requirement.quantity}
              </span>
              <span className="text-xs text-[#5B6B57]">
                {new Date(requirement.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="mt-1 text-[#5B6B57]">
              {requirement.contactName} · {requirement.buyerPhone}
              {requirement.contactEmail ? ` · ${requirement.contactEmail}` : ""}
              {requirement.location ? ` · ${requirement.location}` : ""}
            </p>
            {requirement.notes && <p className="mt-2 text-[#1A1F1A]">{requirement.notes}</p>}
            <p className="mt-2 text-xs text-[#5B6B57]">
              {requirement.isPublic ? "Public" : "Not shown publicly"}
            </p>
          </div>
        ))}
        {buyRequirements.length === 0 && (
          <p className="rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm text-[#5B6B57]">
            No buy requirements yet.
          </p>
        )}
      </div>
    </main>
  );
}
