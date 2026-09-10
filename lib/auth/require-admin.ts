import "server-only";
import { auth } from "@clerk/nextjs/server";

import { isAdminUserId } from "@/lib/auth/admin";

export class NotAuthorizedError extends Error {
  constructor() {
    super("not_authorized");
  }
}

/**
 * Every admin server action/page must call this first (AGENTS.md Section 4:
 * `supabaseAdmin` alone enforces nothing — middleware protects pages, but
 * each privileged write checks for itself too, defense in depth).
 */
export async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!isAdminUserId(userId)) throw new NotAuthorizedError();
  return userId!;
}
