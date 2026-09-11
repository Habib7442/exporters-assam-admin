"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { deleteFromR2, parseR2Url, uploadToR2 } from "@/lib/storage/r2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 1 MB, not the 2 MB used for logos/products elsewhere: a category tile
// renders at ~48px, so this is still generous headroom for a crisp small
// icon, not sized for anything closer to a banner.
const MAX_IMAGE_BYTES = 1 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type CategoryActionResult = { ok: true } | { ok: false; message: string };

/** Uploads an optional category image. Returns url: null (no error) when no file was actually chosen. */
async function uploadCategoryImage(image: File | null): Promise<{ url: string | null; error: string | null }> {
  if (!image || image.size === 0) return { url: null, error: null };
  if (image.size > MAX_IMAGE_BYTES) return { url: null, error: "Image must be under 1 MB." };
  if (!(image.type in ALLOWED_IMAGE_TYPES)) return { url: null, error: "Image must be JPG, PNG, or WebP." };

  const ext = ALLOWED_IMAGE_TYPES[image.type];
  const key = `${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await image.arrayBuffer());
  try {
    const url = await uploadToR2("categories", key, buffer, image.type);
    return { url, error: null };
  } catch {
    return { url: null, error: "Could not upload the image. Please try again." };
  }
}

/** Best effort only: an orphaned R2 object is an accepted, low cost tradeoff (same reasoning as business-listing.ts's deleteLogoBestEffort). */
async function deleteImageBestEffort(url: string): Promise<void> {
  const parsed = parseR2Url(url);
  if (!parsed) return;
  try {
    await deleteFromR2(parsed.category, parsed.key);
  } catch {
    // best effort only
  }
}

/** Creates a category, live immediately — no approval needed, same as an admin-added product. */
export async function createCategory(name: string, image: File | null): Promise<CategoryActionResult> {
  await requireAdmin();

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Enter a category name." };
  if (trimmed.length > 100) return { ok: false, message: "Name must be under 100 characters." };

  const { url: imageUrl, error: uploadError } = await uploadCategoryImage(image);
  if (uploadError) return { ok: false, message: uploadError };

  const { error } = await supabaseAdmin.rpc("create_category", {
    p_name: trimmed,
    p_image_url: imageUrl ?? undefined,
  });

  if (error) {
    if (imageUrl) await deleteImageBestEffort(imageUrl);
    if (error.code === "23505") return { ok: false, message: "A category with that name already exists." };
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  revalidatePath("/categories");
  return { ok: true };
}

/**
 * Updates a category's name and, only if a new image was chosen, replaces
 * the image — best-effort deleting the previous one, same pattern as the
 * storefront's business-listing logo replace.
 */
export async function updateCategory(
  categoryId: string,
  name: string,
  image: File | null,
): Promise<CategoryActionResult> {
  await requireAdmin();

  if (!UUID_RE.test(categoryId)) return { ok: false, message: "Invalid category id." };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Enter a category name." };
  if (trimmed.length > 100) return { ok: false, message: "Name must be under 100 characters." };

  const { url: newImageUrl, error: uploadError } = await uploadCategoryImage(image);
  if (uploadError) return { ok: false, message: uploadError };

  let previousImageUrl: string | null = null;
  if (newImageUrl) {
    const { data: existing } = await supabaseAdmin
      .from("categories")
      .select("image_url")
      .eq("id", categoryId)
      .maybeSingle();
    previousImageUrl = existing?.image_url ?? null;
  }

  const { error } = await supabaseAdmin.rpc("update_category", {
    p_id: categoryId,
    p_name: trimmed,
    p_image_url: newImageUrl ?? undefined,
  });

  if (error) {
    if (newImageUrl) await deleteImageBestEffort(newImageUrl);
    if (error.code === "23505") return { ok: false, message: "A category with that name already exists." };
    if (error.code === "P0004") return { ok: false, message: "Category not found." };
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  if (newImageUrl && previousImageUrl) await deleteImageBestEffort(previousImageUrl);

  revalidatePath("/categories");
  return { ok: true };
}

/** Deletes a category. Blocked by the database (categories.id is on delete restrict from products) if any product still references it. */
export async function deleteCategory(categoryId: string): Promise<CategoryActionResult> {
  await requireAdmin();

  if (!UUID_RE.test(categoryId)) return { ok: false, message: "Invalid category id." };

  const { error } = await supabaseAdmin.from("categories").delete().eq("id", categoryId);

  if (error) {
    if (error.code === "23503") {
      return { ok: false, message: "Can't delete a category that still has products in it." };
    }
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  revalidatePath("/categories");
  return { ok: true };
}
