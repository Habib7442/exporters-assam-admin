"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  Tag,
  X,
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
    items: [{ href: "/memberships", label: "Memberships", icon: CreditCard }],
  },
];

/** A section is active on its own page and on its sub pages (e.g. /companies/[id]/edit). */
function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The brand and navigation, shared by the desktop sidebar and the mobile menu. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-2 px-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#2E7D32] font-bold">E</span>
        <span className="font-semibold">Exporters Assam</span>
      </div>

      <nav className="flex flex-col gap-6" aria-label="Admin">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <span className="px-2 text-xs font-semibold tracking-wide text-white/50 uppercase">{section.label}</span>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
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
    </>
  );
}

/** The fixed sidebar, on large screens only; smaller screens use MobileNav from the top bar. */
export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto bg-[#14532D] px-4 py-6 text-white lg:flex">
      <SidebarContent />
    </aside>
  );
}

/**
 * The menu button and slide out navigation for phones and tablets. Closes
 * on a link tap, a tap outside the panel, or Escape.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Stop the page behind from scrolling while the menu is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        className="-ml-1 flex size-9 items-center justify-center rounded-lg text-[#14532D] hover:bg-[#F6FAF0] lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            id="admin-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-[#14532D] px-4 py-6 text-white shadow-xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-5 right-3 flex size-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
