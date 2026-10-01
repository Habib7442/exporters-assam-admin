import "server-only";

/** The public site. Override with STOREFRONT_URL (e.g. a preview deploy); defaults to production. */
const STOREFRONT_URL = process.env.STOREFRONT_URL || "https://www.exportersassam.com";

/**
 * Tells the public site to refresh its cached pages (home, product and
 * company pages, sitemap) right after an admin change, instead of waiting
 * for their 5 minute cache. Both apps share one database, so a change made
 * here is already live data; this only clears the storefront's stale
 * copies (its `POST /api/revalidate`).
 *
 * Never throws and never blocks for long: the admin's change already
 * succeeded, and if this call fails the storefront's 5 minute cache still
 * catches up. Skipped when REVALIDATE_SECRET isn't set (for example a
 * local copy of this app).
 */
export async function refreshStorefront(): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return;

  try {
    const response = await fetch(`${STOREFRONT_URL}/api/revalidate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error(`refreshStorefront: the storefront answered ${response.status}`);
  } catch (error) {
    console.error("refreshStorefront failed", error);
  }
}
