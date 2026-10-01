import "server-only";

import { deleteFromR2, parseR2Url, uploadToR2 } from "@/lib/storage/r2";

/**
 * Image checks and R2 plumbing shared by the admin's product add and edit
 * and company logo replacement, so every admin upload follows one set of
 * rules (the same limits as the storefront's supplier uploads).
 */

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 5;
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** A field error for these files' type and size, or null when they're all fine. */
export function imageFileError(files: File[]): string | null {
  if (files.some((file) => !(file.type in ALLOWED_IMAGE_TYPES))) return "Images must be JPG, PNG, or WebP.";
  if (files.some((file) => file.size > MAX_IMAGE_BYTES)) return "Each image must be under 2 MB.";
  return null;
}

/**
 * True when the bytes really start like the claimed image type, so a file
 * renamed to .jpg can't be stored. A light check without a decoder: the
 * admin is a trusted internal user, unlike the storefront's public
 * supplier uploads, which decode every image with sharp.
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

export type UploadResult = { ok: true; urls: string[]; keys: string[] } | { ok: false; error: string };

/**
 * Checks every file's real bytes, then uploads them all under
 * `{category}/{prefix}/{uuid}.{ext}`. Checking all before uploading any
 * means one bad file never leaves the others orphaned; a failed upload
 * removes whatever already landed.
 */
export async function uploadImages(category: "products" | "logos", prefix: string, files: File[]): Promise<UploadResult> {
  const buffers = await Promise.all(files.map(async (file) => Buffer.from(await file.arrayBuffer())));
  if (buffers.some((buffer, i) => !hasImageSignature(buffer, files[i].type))) {
    return { ok: false, error: "Images must be real JPG, PNG, or WebP files." };
  }

  const keys: string[] = [];
  const uploads = await Promise.allSettled(
    buffers.map(async (buffer, i) => {
      const key = `${prefix}/${crypto.randomUUID()}.${ALLOWED_IMAGE_TYPES[files[i].type]}`;
      const url = await uploadToR2(category, key, buffer, files[i].type);
      keys.push(key);
      return url;
    }),
  );
  if (uploads.some((upload) => upload.status === "rejected")) {
    await removeUploads(category, keys);
    return { ok: false, error: "Could not upload the images. Please try again." };
  }
  return { ok: true, urls: uploads.map((upload) => (upload as PromiseFulfilledResult<string>).value), keys };
}

/** Best effort: removes just-uploaded objects after a later step failed. An orphaned object is an accepted, low cost tradeoff. */
export async function removeUploads(category: "products" | "logos", keys: string[]): Promise<void> {
  await Promise.all(
    keys.map((key) =>
      deleteFromR2(category, key).catch(() => {
        // best effort only
      }),
    ),
  );
}

/** Best effort: deletes stored images by public URL (ones an edit replaced or dropped). Returns how many failed. */
export async function deleteImagesByUrl(urls: string[]): Promise<number> {
  const keys = [...new Set(urls)].map(parseR2Url).filter((parsed) => parsed !== null);
  const deletions = await Promise.allSettled(keys.map(({ category, key }) => deleteFromR2(category, key)));
  return deletions.filter((deletion) => deletion.status === "rejected").length;
}
