"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

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
    <header className="flex items-center justify-between gap-4 border-b border-[#E3E9DC] bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-[#14532D]">{title}</h1>
      <UserButton />
    </header>
  );
}
