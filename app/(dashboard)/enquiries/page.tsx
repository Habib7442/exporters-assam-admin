import { requireAdmin } from "@/lib/auth/require-admin";
import { formatDateTime } from "@/lib/format-date";
import { getRecentEnquiries } from "@/lib/supabase/queries/enquiries";

export default async function EnquiriesPage() {
  await requireAdmin();
  const enquiries = await getRecentEnquiries();

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <p className="text-sm text-[#5B6B57]">{enquiries.length} enquiries.</p>

      <div className="flex flex-col gap-3">
        {enquiries.map((enquiry) => (
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
            {enquiry.message && <p className="mt-2 text-[#1A1F1A]">{enquiry.message}</p>}
            <p className="mt-2 text-xs text-[#5B6B57]">
              {enquiry.whatsappForwardedAt ? "WhatsApp link generated" : "No WhatsApp contact on file"}
            </p>
          </div>
        ))}
        {enquiries.length === 0 && (
          <p className="rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm text-[#5B6B57]">
            No enquiries yet.
          </p>
        )}
      </div>
    </main>
  );
}
