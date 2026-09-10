import { requireAdmin } from "@/lib/auth/require-admin";
import { ComingSoon } from "@/components/coming-soon";

export default async function SettingsPage() {
  await requireAdmin();
  return <ComingSoon what="Settings" />;
}
