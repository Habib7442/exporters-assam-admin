import { clerkClient } from "@clerk/nextjs/server";

/**
 * Which Clerk user ids may use this admin app at all. Not Clerk
 * Organizations/roles — decided inline with the engineer: this is a small
 * internal tool with a handful of admins. Two sources, either is enough:
 *
 *  - `ADMIN_CLERK_USER_IDS` env var (comma-separated ids) — the original
 *    bootstrap mechanism. Kept as a fallback so existing access never
 *    silently breaks on this change, and so there's always a way in that
 *    doesn't depend on Clerk dashboard state (a real bootstrapping
 *    problem: granting the *first* admin via metadata requires already
 *    being an admin to reach the Clerk dashboard's Users page and set it).
 *  - `publicMetadata.role === "admin"` on the Clerk user — settable
 *    directly from the Clerk dashboard (Users → a user → Metadata →
 *    Public → Edit), no redeploy needed. The preferred way to grant/revoke
 *    access going forward.
 *
 * Deliberately not `server-only` guarded: both `proxy.ts` middleware (edge
 * runtime, no `react-server` condition) and server actions need this, and
 * `clerkClient()` itself already guards the actual secret key.
 */
export async function isAdminUserId(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  const allowed = (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (allowed.includes(userId)) return true;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return user.publicMetadata.role === "admin";
}
