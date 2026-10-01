import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDateTime } from "@/lib/format-date";
import { getRecentBuyRequirements } from "@/lib/supabase/queries/buy-requirements";
import { BuyRequirementControls } from "@/components/buy-requirement-controls";

export default async function BuyRequirementsPage() {
  await requireAdmin();
  const buyRequirements = await getRecentBuyRequirements();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      <p className="text-sm text-[#5B6B57]">{buyRequirements.length} buy requirements.</p>

      <div className="flex flex-col gap-3">
        {buyRequirements.map((requirement) => (
          <div key={requirement.id} className="rounded-xl border border-[#E3E9DC] bg-white p-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-[#1A1F1A]">
                {requirement.productText} · {requirement.quantity}
              </span>
              <span className="text-xs text-[#5B6B57]">{formatDateTime(requirement.createdAt)}</span>
            </div>
            <p className="mt-1 text-[#5B6B57]">
              {requirement.contactName} · {requirement.buyerPhone}
              {requirement.contactEmail ? ` · ${requirement.contactEmail}` : ""}
              {requirement.location ? ` · ${requirement.location}` : ""}
            </p>
            {requirement.notes && <p className="mt-2 text-[#1A1F1A]">{requirement.notes}</p>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${requirement.isPublic ? "bg-[#E4EFD4] text-[#14532D]" : "bg-zinc-200 text-zinc-700"}`}
              >
                {requirement.isPublic ? "Public" : "Not shown publicly"}
              </span>
              <BuyRequirementControls
                id={requirement.id}
                isPublic={requirement.isPublic}
                label={`${requirement.productText} · ${requirement.quantity}`}
              />
            </div>
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
