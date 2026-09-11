import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExportsAssam Admin",
  description: "Internal admin dashboard for ExportsAssam.com",
};

// Brand tokens (DESIGN.md, ../expoters-assam — shared brand, restated here
// since this app doesn't share code with the storefront). Passed to every
// Clerk component (SignIn, SignUp, UserButton) via one ClerkProvider prop,
// rather than the storefront's @clerk/ui + shadcn theme, which this small
// internal tool doesn't otherwise need (AGENTS.md: don't install shadcn
// preemptively).
const clerkAppearance = {
  variables: {
    colorPrimary: "#2E7D32",
    colorBackground: "#FFFFFF",
    colorText: "#1A1F1A",
    colorTextSecondary: "#5B6B57",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#1A1F1A",
    colorNeutral: "#1A1F1A",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans), sans-serif",
  },
  // Hides the Google sign-in/sign-up option on this app specifically
  // (decided inline with the engineer): Google OAuth stays enabled on the
  // shared Clerk instance (the storefront still offers it), but this app's
  // own pages never render it. This does not change who can act as admin —
  // that's ADMIN_CLERK_USER_IDS (lib/auth/admin.ts), checked independently
  // of how someone signed in. Element keys confirmed against the installed
  // @clerk/ui source (customizables/elementDescriptors.js), not guessed:
  // socialButtonsRoot is the whole social-buttons block (today, just the
  // Google button — providers aren't individually filterable here), and
  // dividerRow is the "or" separator that would otherwise be left dangling
  // with nothing above it.
  elements: {
    socialButtonsRoot: { display: "none" },
    dividerRow: { display: "none" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F6FAF0]">
        <ClerkProvider appearance={clerkAppearance}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
