"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

import { MobileNav } from "@/components/admin-sidebar";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/companies": "Companies",
  "/products": "Products",
  "/categories": "Categories",
  "/enquiries": "Enquiries",
  "/buy-requirements": "Buy Requirements",
  "/memberships": "Memberships",
};

function resolveTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const section = Object.entries(PAGE_TITLES).find(
    ([path]) => path !== "/" && pathname.startsWith(`${path}/`),
  );
  return section?.[1] ?? "ExportsAssam Admin";
}

export function AdminTopbar() {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[#E3E9DC] bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <h1 className="truncate text-lg font-semibold text-[#14532D]">{title}</h1>
      </div>
      <UserButton />
    </header>
  );
}
