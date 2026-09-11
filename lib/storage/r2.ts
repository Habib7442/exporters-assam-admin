import "server-only";
import {
  createR2Client,
  deleteFromR2 as deleteFromR2Core,
  isR2Url as isR2UrlCore,
  parseR2Url as parseR2UrlCore,
  uploadToR2 as uploadToR2Core,
  type R2Category,
} from "@/lib/storage/r2-client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const accountId = requireEnv("R2_ACCOUNT_ID");
const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
const bucket = requireEnv("R2_BUCKET");
const publicDomain = requireEnv("R2_PUBLIC_IMAGE_DOMAIN");

const client = createR2Client({ accountId, accessKeyId, secretAccessKey });
const config = { bucket, publicDomain };

/**
 * The validated public domain, for any caller that needs to check a stored
 * URL against it without duplicating a `process.env` read that has no
 * fail-fast of its own.
 */
export const R2_PUBLIC_DOMAIN = publicDomain;

/** `isR2Url` closed over this bucket's validated public domain. */
export function isR2Url(url: string): boolean {
  return isR2UrlCore(publicDomain, url);
}

/**
 * App facing entry point: uploads a file to R2 and returns its public URL.
 * The only import app code should use; `lib/storage/r2-client.ts` is the
 * unguarded core (same split as the storefront's own copy of this module,
 * kept for consistency even though this app has no plain-script caller
 * today) — the `server-only` guard here throws unconditionally outside
 * Next's own module resolution.
 */
export async function uploadToR2(
  category: R2Category,
  key: string,
  file: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  return uploadToR2Core(client, config, category, key, file, contentType);
}

/** Deletes an object this bucket holds. */
export async function deleteFromR2(category: R2Category, key: string): Promise<void> {
  return deleteFromR2Core(client, config, category, key);
}

/** Reverses this bucket's public URL shape back into a category and key, or `null` if it doesn't match. */
export function parseR2Url(url: string): { category: R2Category; key: string } | null {
  return parseR2UrlCore(publicDomain, url);
}
