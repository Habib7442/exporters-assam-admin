import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Privileged Supabase client (secret key, bypasses RLS). Server-only —
 * `server-only` throws at build time if this is ever imported from client code.
 * The admin panel does most of its writes through this client: approving or
 * rejecting supplier product submissions, managing companies/categories/members,
 * and viewing all enquiries and membership payments.
 */
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);
