import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EnquiryListItem = {
  id: string;
  productName: string | null;
  companyName: string | null;
  contactName: string;
  contactEmail: string | null;
  buyerPhone: string;
  message: string | null;
  whatsappForwardedAt: string | null;
  createdAt: string;
};

/** Every enquiry, most recent first — admin's read-only view (AGENTS.md: "views all buyer enquiries"). */
export async function getRecentEnquiries(): Promise<EnquiryListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("enquiries")
    .select(
      "id, product_name, company_name, contact_name, contact_email, message, whatsapp_forwarded_at, created_at, buyers(phone)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    productName: row.product_name,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    buyerPhone: row.buyers?.phone ?? "",
    message: row.message,
    whatsappForwardedAt: row.whatsapp_forwarded_at,
    createdAt: row.created_at,
  }));
}
