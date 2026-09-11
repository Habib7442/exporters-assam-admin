import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type DashboardStats = {
  totalCompanies: number;
  pendingCompanies: number;
  totalProducts: number;
  pendingProducts: number;
  totalEnquiries: number;
  totalBuyRequirements: number;
};

/**
 * Row counts for the dashboard's stat cards. `head: true` asks Postgres for
 * just the count, not the rows themselves (AGENTS.md/supabase-postgres-
 * best-practices: never fetch data you're going to throw away).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalCompanies, error: totalCompaniesError },
    { count: pendingCompanies, error: pendingCompaniesError },
    { count: totalProducts, error: totalProductsError },
    { count: pendingProducts, error: pendingProductsError },
    { count: totalEnquiries, error: totalEnquiriesError },
    { count: totalBuyRequirements, error: totalBuyRequirementsError },
  ] = await Promise.all([
    supabaseAdmin.from("companies").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("companies").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("products").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("products").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("enquiries").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("buy_requirements").select("*", { count: "exact", head: true }),
  ]);

  const error =
    totalCompaniesError ??
    pendingCompaniesError ??
    totalProductsError ??
    pendingProductsError ??
    totalEnquiriesError ??
    totalBuyRequirementsError;
  if (error) throw error;

  return {
    totalCompanies: totalCompanies ?? 0,
    pendingCompanies: pendingCompanies ?? 0,
    totalProducts: totalProducts ?? 0,
    pendingProducts: pendingProducts ?? 0,
    totalEnquiries: totalEnquiries ?? 0,
    totalBuyRequirements: totalBuyRequirements ?? 0,
  };
}
