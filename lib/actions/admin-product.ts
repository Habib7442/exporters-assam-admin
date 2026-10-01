"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { deleteFromR2, uploadToR2 } from "@/lib/storage/r2";
import { supabaseAdmin } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Same limits as a supplier's own product submission on the storefront.
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGES = 5;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type AdminProductInput = {
  companyId: string;
  name: string;
  description: string;
  categoryId: string;
  images: File[];
};

export type AdminProductResult =
  | { ok: true; slug: string }
  | { ok: false; message: string; fieldErrors?: Partial<Record<"name" | "categoryId" | "images", string>> };

/**
 * True when the bytes really start like the claimed image type, so a file
 * renamed to .jpg can't be stored as a product photo. A light check without
 * a decoder: the admin is a trusted internal user, unlike the storefront's
 * public supplier uploads, which decode every image with sharp.
 */
function hasImageSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b);
  if (type === "image/webp") {
    const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
    return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  }
  return false;
}

async function cleanupUploads(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((key) =>
      deleteFromR2("products", key).catch(() => {
        // best effort only: an orphaned R2 object is an accepted, low cost tradeoff
      }),
    ),
  );
}

/**
 * Adds a product to a company, live immediately (PRD Section 4: an admin
 * added product needs no approval). Images are checked, then uploaded to
 * R2 under `products/admin/{uuid}.{ext}`, then the product is written
 * through `create_admin_product`, which also checks the company is
 * approved. Any failure after an upload removes the uploaded images.
 */
export async function createAdminProduct(input: AdminProductInput): Promise<AdminProductResult> {
  await requireAdmin();

  if (!UUID_RE.test(input.companyId)) return { ok: false, message: "Invalid company." };

  const name = input.name.trim();
  const description = input.description.trim();
  const fieldErrors: NonNullable<Extract<AdminProductResult, { ok: false }>["fieldErrors"]> = {};
  if (name.length < 2) fieldErrors.name = "Enter a product name.";
  else if (name.length > 200) fieldErrors.name = "Name must be under 200 characters.";
  if (!UUID_RE.test(input.categoryId)) fieldErrors.categoryId = "Choose a category.";

  const images = input.images.filter((file) => file.size > 0);
  if (images.length === 0) fieldErrors.images = "Add at least one image.";
  else if (images.length > MAX_IMAGES) fieldErrors.images = `Up to ${MAX_IMAGES} images.`;
  else if (images.some((file) => !(file.type in ALLOWED_IMAGE_TYPES))) fieldErrors.images = "Images must be JPG, PNG, or WebP.";
  else if (images.some((file) => file.size > MAX_IMAGE_BYTES)) fieldErrors.images = "Each image must be under 2 MB.";

  if (description.length > 2000) return { ok: false, message: "Description must be under 2000 characters." };
  if (Object.keys(fieldErrors).length > 0) return { ok: false, message: "Please check the form.", fieldErrors };

  // Read and check every file before uploading any, so one bad file never
  // leaves the others orphaned in R2.
  const buffers = await Promise.all(images.map(async (file) => Buffer.from(await file.arrayBuffer())));
  if (buffers.some((buffer, i) => !hasImageSignature(buffer, images[i].type))) {
    return { ok: false, message: "Please check the form.", fieldErrors: { images: "Images must be real JPG, PNG, or WebP files." } };
  }

  const keys: string[] = [];
  const uploads = await Promise.allSettled(
    buffers.map(async (buffer, i) => {
      const key = `admin/${crypto.randomUUID()}.${ALLOWED_IMAGE_TYPES[images[i].type]}`;
      const url = await uploadToR2("products", key, buffer, images[i].type);
      keys.push(key);
      return url;
    }),
  );
  if (uploads.some((upload) => upload.status === "rejected")) {
    await cleanupUploads(keys);
    return { ok: false, message: "Could not upload the images. Please try again." };
  }
  const imageUrls = uploads.map((upload) => (upload as PromiseFulfilledResult<string>).value);

  const { data, error } = await supabaseAdmin.rpc("create_admin_product", {
    p_company_id: input.companyId,
    p_name: name,
    p_description: (description || null) as string,
    p_category_id: input.categoryId,
    p_image_urls: imageUrls,
  });

  if (error || !data?.[0]) {
    await cleanupUploads(keys);
    if (error?.code === "P0004") return { ok: false, message: "This company no longer exists." };
    if (error?.code === "P0007") return { ok: false, message: "Products can only be added to an approved company." };
    if (error?.code === "23503") return { ok: false, message: "Please check the form.", fieldErrors: { categoryId: "Choose a category." } };
    return { ok: false, message: "Something went wrong. Please try again." };
  }

  revalidatePath(`/companies/${input.companyId}`);
  revalidatePath("/products");
  return { ok: true, slug: data[0].slug };
}
