"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteImagesByUrl, imageFileError, MAX_PRODUCT_IMAGES, removeUploads, uploadImages } from "@/lib/image-upload";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { refreshStorefront } from "@/lib/storefront";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type FieldErrors = Partial<Record<"name" | "categoryId" | "images", string>>;

export type AdminProductResult = { ok: true } | { ok: false; message: string; fieldErrors?: FieldErrors };

const CHECK_FORM = "Please check the form.";

/** The name, category and description rules, shared by add and edit. */
function checkDetails(input: { name: string; description: string; categoryId: string }): {
  name: string;
  description: string;
  fieldErrors: FieldErrors;
  descriptionError: string | null;
} {
  const name = input.name.trim();
  const description = input.description.trim();
  const fieldErrors: FieldErrors = {};
  if (name.length < 2) fieldErrors.name = "Enter a product name.";
  else if (name.length > 200) fieldErrors.name = "Name must be under 200 characters.";
  if (!UUID_RE.test(input.categoryId)) fieldErrors.categoryId = "Choose a category.";
  return { name, description, fieldErrors, descriptionError: description.length > 2000 ? "Description must be under 2000 characters." : null };
}

export type AdminProductInput = {
  companyId: string;
  name: string;
  description: string;
  categoryId: string;
  images: File[];
};

/**
 * Adds a product to a company, live immediately (PRD Section 4: an admin
 * added product needs no approval). Images are checked, then uploaded to
 * R2 under `products/admin/`, then the product is written through
 * `create_admin_product`, which also checks the company is approved. Any
 * failure after an upload removes the uploaded images.
 */
export async function createAdminProduct(input: AdminProductInput): Promise<AdminProductResult> {
  await requireAdmin();
  if (!UUID_RE.test(input.companyId)) return { ok: false, message: "Invalid company." };

  const { name, description, fieldErrors, descriptionError } = checkDetails(input);
  const images = input.images.filter((file) => file.size > 0);
  if (images.length === 0) fieldErrors.images = "Add at least one image.";
  else if (images.length > MAX_PRODUCT_IMAGES) fieldErrors.images = `Up to ${MAX_PRODUCT_IMAGES} images.`;
  else fieldErrors.images = imageFileError(images) ?? undefined;
  if (!fieldErrors.images) delete fieldErrors.images;

  if (descriptionError) return { ok: false, message: descriptionError };
  if (Object.keys(fieldErrors).length > 0) return { ok: false, message: CHECK_FORM, fieldErrors };

  const upload = await uploadImages("products", "admin", images);
  if (!upload.ok) return { ok: false, message: CHECK_FORM, fieldErrors: { images: upload.error } };

  const { data, error } = await supabaseAdmin.rpc("create_admin_product", {
    p_company_id: input.companyId,
    p_name: name,
    p_description: (description || null) as string,
    p_category_id: input.categoryId,
    p_image_urls: upload.urls,
  });

  if (error || !data?.[0]) {
    await removeUploads("products", upload.keys);
    if (error?.code === "P0004") return { ok: false, message: "This company no longer exists." };
    if (error?.code === "P0007") return { ok: false, message: "Products can only be added to an approved company." };
    if (error?.code === "23503") return { ok: false, message: CHECK_FORM, fieldErrors: { categoryId: "Choose a category." } };
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  revalidatePath(`/companies/${input.companyId}`);
  revalidatePath("/products");
  await refreshStorefront();
  return { ok: true };
}

export type UpdateAdminProductInput = {
  productId: string;
  name: string;
  description: string;
  categoryId: string;
  /** Which of the product's current images to keep, in order; the first kept is the main photo. */
  keepImageUrls: string[];
  newImages: File[];
};

/**
 * Edits any product's details and photos. The status stays as it is: an
 * admin is trusted, so an approved product stays live (unlike a supplier's
 * own edit, which goes back to review). The slug stays the same, so links
 * keep working. Kept images must be ones the product already has; images
 * the edit dropped are deleted from R2 after the write succeeds.
 */
export async function updateAdminProduct(input: UpdateAdminProductInput): Promise<AdminProductResult> {
  await requireAdmin();
  if (!UUID_RE.test(input.productId)) return { ok: false, message: "Invalid product." };

  const { name, description, fieldErrors, descriptionError } = checkDetails(input);
  const newImages = input.newImages.filter((file) => file.size > 0);
  const total = input.keepImageUrls.length + newImages.length;
  if (total === 0) fieldErrors.images = "Keep or add at least one image.";
  else if (total > MAX_PRODUCT_IMAGES) fieldErrors.images = `Up to ${MAX_PRODUCT_IMAGES} images in total.`;
  else if (newImages.length > 0) fieldErrors.images = imageFileError(newImages) ?? undefined;
  if (!fieldErrors.images) delete fieldErrors.images;

  if (descriptionError) return { ok: false, message: descriptionError };
  if (Object.keys(fieldErrors).length > 0) return { ok: false, message: CHECK_FORM, fieldErrors };

  const { data: product, error: readError } = await supabaseAdmin
    .from("products")
    .select("id, company_id, image_url, gallery_urls")
    .eq("id", input.productId)
    .maybeSingle();
  if (readError) return { ok: false, message: "Something went wrong. Please try again." };
  if (!product) return { ok: false, message: "This product no longer exists." };

  const currentUrls = product.gallery_urls.length > 0 ? product.gallery_urls : [product.image_url];
  if (input.keepImageUrls.some((url) => !currentUrls.includes(url))) {
    return { ok: false, message: CHECK_FORM, fieldErrors: { images: "The photos changed while you were editing. Reload and try again." } };
  }

  let newUrls: string[] = [];
  let newKeys: string[] = [];
  if (newImages.length > 0) {
    const upload = await uploadImages("products", "admin", newImages);
    if (!upload.ok) return { ok: false, message: CHECK_FORM, fieldErrors: { images: upload.error } };
    newUrls = upload.urls;
    newKeys = upload.keys;
  }

  const imageUrls = [...input.keepImageUrls, ...newUrls];
  const { error } = await supabaseAdmin
    .from("products")
    .update({
      name,
      description: description || null,
      category_id: input.categoryId,
      image_url: imageUrls[0],
      gallery_urls: imageUrls,
    })
    .eq("id", product.id);

  if (error) {
    await removeUploads("products", newKeys);
    if (error.code === "23503") return { ok: false, message: CHECK_FORM, fieldErrors: { categoryId: "Choose a category." } };
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  await deleteImagesByUrl(currentUrls.filter((url) => !input.keepImageUrls.includes(url)));

  revalidatePath(`/companies/${product.company_id}`);
  revalidatePath("/products");
  await refreshStorefront();
  return { ok: true };
}
