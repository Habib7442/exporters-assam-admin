import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isAdminUserId } from "@/lib/auth/admin";

// "/__clerk/:path*" must be public too: Clerk's own JS SDK/UI bundles are
// served through this proxy path (see the matcher below), and a signed-out
// visitor loading /sign-in needs to fetch them *before* they have a
// session — redirecting this path to /sign-in (as every other protected
// route does) creates a loop where the sign-in page can never load its own
// script, and the browser gets that page's HTML back instead of real JS.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/not-authorized",
  "/__clerk(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: req.url });

  if (!(await isAdminUserId(userId))) {
    return NextResponse.redirect(new URL("/not-authorized", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
