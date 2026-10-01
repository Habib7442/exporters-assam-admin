"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteFromR2, parseR2Url } from "@/lib/storage/r2";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refreshStorefront } from "@/lib/storefront";

/**
 * Take downs for live listings (storefront spec 0007): hide, unhide and
 * permanently delete a product or a whole company. `hidden` is the
 * storefront's reversible take down status: every public page, search,
 * enquiry form and the sitemap only show `approved`, so a hidden row
 * disappears everywhere. The storefront caches its public pages for 5
 * minutes, and this app can't refresh that cache, so a change shows there
 * within 5 minutes.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ManagementResult = { ok: true } | { ok: false; message: string };

const INVALID_ID: ManagementResult = { ok: false, message: "Invalid id." };
const SERVER_ERROR: ManagementResult = { ok: false, message: "Something went wrong. Please try again." };

type ListingTable = "products" | "companies";

/**
 * Moves one row from `from` to `to`, scoped to the state the page showed,
 * so a stale page can't, say, unhide a product someone already deleted or
 * re-approve one that went back to review. `.select("id")` makes a zero
 * row update visible instead of a false success.
 */
async function moveStatus(table: ListingTable, id: string, from: string, to: string): Promise<ManagementResult> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return INVALID_ID;

  const { data, error } = await supabaseAdmin
    .from(table)
    .update({ status: to, rejection_reason: null })
    .eq("id", id)
    .eq("status", from)
    .select("id");

  if (error) return SERVER_ERROR;
  if (!data?.length) return { ok: false, message: "This changed since the page loaded. Refresh and try again." };

  revalidatePath("/companies", "layout");
  await refreshStorefront();
  return { ok: true };
}

/** Takes a live product down, reversibly. */
export async function hideProduct(productId: string): Promise<ManagementResult> {
  return moveStatus("products", productId, "approved", "hidden");
}

/** Puts a hidden product back on the site. */
export async function unhideProduct(productId: string): Promise<ManagementResult> {
  return moveStatus("products", productId, "hidden", "approved");
}

/** Takes a live company and, with it, all its products down, reversibly. */
export async function hideCompany(companyId: string): Promise<ManagementResult> {
  return moveStatus("companies", companyId, "approved", "hidden");
}

/** Puts a hidden company back on the site. */
export async function unhideCompany(companyId: string): Promise<ManagementResult> {
  return moveStatus("companies", companyId, "hidden", "approved");
}

/**
 * Deletes stored images by public URL; true only if every one is gone.
 * Images go before rows (same rule as the storefront's supplier deletion):
 * once the row is gone nothing records the image's key any more.
 */
async function deleteImages(urls: string[]): Promise<boolean> {
  const keys = [...new Set(urls)].map(parseR2Url).filter((parsed) => parsed !== null);
  const deletions = await Promise.allSettled(keys.map(({ category, key }) => deleteFromR2(category, key)));
  return deletions.every((deletion) => deletion.status === "fulfilled");
}

const IMAGES_FAILED: ManagementResult = {
  ok: false,
  message: "Some images couldn't be deleted, so nothing was removed. Please try again.",
};

/** Permanently deletes a product and its images, in any status. Enquiries keep their row with the product link cleared. */
export async function deleteProductPermanently(productId: string): Promise<ManagementResult> {
  await requireAdmin();
  if (!UUID_RE.test(productId)) return INVALID_ID;

  const { data: product, error } = await supabaseAdmin
    .from("products")
    .select("id, image_url, gallery_urls")
    .eq("id", productId)
    .maybeSingle();
  if (error) return SERVER_ERROR;
  if (!product) return { ok: false, message: "This product was already deleted." };

  if (!(await deleteImages([product.image_url, ...product.gallery_urls]))) return IMAGES_FAILED;

  const { error: deleteError } = await supabaseAdmin.from("products").delete().eq("id", product.id);
  if (deleteError) return SERVER_ERROR;

  revalidatePath("/companies", "layout");
  revalidatePath("/products");
  await refreshStorefront();
  return { ok: true };
}

/**
 * Permanently deletes a company: every product image and the logo first,
 * then the company row, which cascades to its products, WhatsApp contact
 * and memberships. Enquiries keep their row with the links cleared. The
 * supplier's Clerk account stays (hiding is the tool for a suspension).
 */
export async function deleteCompanyPermanently(companyId: string): Promise<ManagementResult> {
  await requireAdmin();
  if (!UUID_RE.test(companyId)) return INVALID_ID;

  const { data: company, error } = await supabaseAdmin
    .from("companies")
    .select("id, logo_url, products(image_url, gallery_urls)")
    .eq("id", companyId)
    .maybeSingle();
  if (error) return SERVER_ERROR;
  if (!company) return { ok: false, message: "This company was already deleted." };

  const urls: string[] = company.logo_url ? [company.logo_url] : [];
  for (const product of company.products ?? []) urls.push(product.image_url, ...product.gallery_urls);
  if (!(await deleteImages(urls))) return IMAGES_FAILED;

  const { error: deleteError } = await supabaseAdmin.from("companies").delete().eq("id", company.id);
  if (deleteError) return SERVER_ERROR;

  revalidatePath("/companies", "layout");
  revalidatePath("/products");
  await refreshStorefront();
  return { ok: true };
}
