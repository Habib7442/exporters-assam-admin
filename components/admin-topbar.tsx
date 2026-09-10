"use client";

import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/companies": "Companies",
  "/enquiries": "Enquiries",
  "/buy-requirements": "Buy Requirements",
  "/memberships": "Memberships",
  "/settings": "Settings",
};

export function AdminTopbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? "ExportsAssam Admin";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-[#E3E9DC] bg-white px-6 py-4">
      <h1 className="text-lg font-semibold text-[#14532D]">{title}</h1>
      <UserButton />
    </header>
  );
}
