/**
 * Which Clerk user ids may use this admin app at all. Not Clerk
 * Organizations/roles — decided inline with the engineer: this is a small
 * internal tool with a handful of admins, an allowlist is enough for now
 * (AGENTS.md Section 4's open "route protection" decision). Deliberately
 * not `server-only` guarded: both `proxy.ts` middleware (edge runtime, no
 * `react-server` condition) and server actions need this, and it holds no
 * secret of its own, just a comparison against an env var already resolved
 * server-side.
 */
export function isAdminUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const allowed = (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return allowed.includes(userId);
}
