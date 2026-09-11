const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/**
 * Always an explicit locale and options: `toLocaleString()`/
 * `toLocaleDateString()` with no arguments use the runtime's default
 * locale, which differs between the Node server (SSR render) and the
 * browser (client hydration) — a classic Next.js hydration mismatch for
 * any Client Component that renders one (caught live: pending-company-card
 * and pending-product-card both crashed on this).
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", DATE_TIME_OPTIONS);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", DATE_OPTIONS);
}
