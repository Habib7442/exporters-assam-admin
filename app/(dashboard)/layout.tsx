import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      {/* min-w-0 lets this column shrink below its content, so wide tables scroll inside their own box instead of widening the page. */}
      <div className="flex min-w-0 flex-1 flex-col bg-[#F6FAF0]">
        <AdminTopbar />
        {children}
      </div>
    </div>
  );
}
