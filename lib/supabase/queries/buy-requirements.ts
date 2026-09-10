import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type BuyRequirementListItem = {
  id: string;
  productText: string;
  quantity: string;
  location: string | null;
  notes: string | null;
  contactName: string;
  contactEmail: string | null;
  buyerPhone: string;
  isPublic: boolean;
  createdAt: string;
};

/** Every buy requirement, most recent first — admin's read-only view (AGENTS.md: "views ... buy requirements"). */
export async function getRecentBuyRequirements(): Promise<BuyRequirementListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("buy_requirements")
    .select(
      "id, product_text, quantity, location, notes, contact_name, contact_email, is_public, created_at, buyers(phone)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    productText: row.product_text,
    quantity: row.quantity,
    location: row.location,
    notes: row.notes,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    buyerPhone: row.buyers?.phone ?? "",
    isPublic: row.is_public,
    createdAt: row.created_at,
  }));
}
