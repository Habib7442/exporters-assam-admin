// This app has no user-configurable timezone, so every timestamp is shown
// in the business's own timezone (Avadi Herbs India Pvt. Ltd., Assam) —
// a fixed reference an admin can always interpret consistently, rather
// than whatever the SSR host or the admin's own machine happens to default
// to.
const TIME_ZONE = "Asia/Kolkata";

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: TIME_ZONE,
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: TIME_ZONE,
};

/**
 * Always an explicit locale, timezone, and options: `toLocaleString()`/
 * `toLocaleDateString()` with no arguments use the runtime's default
 * locale AND timezone, both of which differ between the Node server (SSR
 * render) and the browser (client hydration) — a classic Next.js hydration
 * mismatch for any Client Component that renders one (caught live:
 * pending-company-card and pending-product-card both crashed on the locale
 * half of this; the timezone half was still latent — same instant, same
 * fixed locale, but Sep 11 in one runtime's local zone and Sep 10 in
 * another's, verified directly against this runtime's own default zone).
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", DATE_TIME_OPTIONS);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", DATE_OPTIONS);
}
