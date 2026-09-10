import { requireAdmin } from "@/lib/auth/require-admin";
import { ComingSoon } from "@/components/coming-soon";

export default async function MembershipsPage() {
  await requireAdmin();
  return <ComingSoon what="Membership management (Razorpay isn't wired up yet)" />;
}
