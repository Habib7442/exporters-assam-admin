"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Tag,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Main menu",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/companies", label: "Companies", icon: Building2 },
      { href: "/products", label: "Products", icon: Package },
      { href: "/categories", label: "Categories", icon: Tag },
      { href: "/enquiries", label: "Enquiries", icon: MessageSquare },
      { href: "/buy-requirements", label: "Buy Requirements", icon: ClipboardList },
    ],
  },
  {
    label: "Management",
    items: [
      { href: "/memberships", label: "Memberships", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 bg-[#14532D] px-4 py-6 text-white">
      <div className="flex items-center gap-2 px-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#2E7D32] font-bold">
          E
        </span>
        <span className="font-semibold">ExportsAssam</span>
      </div>

      <nav className="flex flex-col gap-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <span className="px-2 text-xs font-semibold tracking-wide text-white/50 uppercase">
              {section.label}
            </span>
            {section.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-white text-[#14532D]" : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
