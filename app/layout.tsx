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
