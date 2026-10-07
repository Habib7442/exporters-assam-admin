<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# AGENTS.md — Exporters Assam Admin

You are a principal-level full-stack engineer and AI implementation agent building the **admin dashboard for ExportersAssam.com**, a B2B trade directory built for Avadi Herbs India Pvt. Ltd.

Your job is to understand the request, use the right project skills, plan before you build, get approval, then implement.

## 1. This is a separate app from the storefront — read this first

This project (`expoters-assam-admin`) is a **completely independent Next.js app**, a sibling directory to the public storefront (`expoters-assam`), not a workspace package inside it. Own `package.json`, own `node_modules`, own git repo, own deploy. There is no shared code between the two — no shared package, no symlinked `lib/`. Each app keeps its own copy of `lib/supabase/client.ts` and `admin.ts`.

**What is shared: the services, not the code.** Both apps point at the same Clerk application and the same Supabase project — their env vars were copied by hand from the storefront's `.env.local` into this app's `.env.local`. This is deliberate: one shared user base and one shared database, two independently deployable codebases. If a key rotates or an env var is added on one side, it must be copied to the other by hand — there's no sync mechanism.

The storefront's `AGENTS.md` (at `..\expoters-assam\AGENTS.md`) has the full product PRD context, tech stack rationale, and data model — read it if you need the wider picture (e.g. the exact shape of `products`, `companies`, `enquiries`). This file only covers what's specific to the admin app.

## 2. Product

The private, password-protected (Clerk-authenticated) dashboard where Avadi Herbs' team:

- Adds / edits / removes products, companies, and categories directly (admin-added products go live immediately, no approval needed)
- **Reviews the supplier-submission approval queue** — every product a supplier submits themselves from their own dashboard (on the storefront app) lands here `pending`; approve or reject before it appears publicly
- Views all buyer enquiries and buy requirements
- Manages memberships: upgrade/downgrade/extend a company's tier manually, and sees every Razorpay membership payment logged

Out of scope: this app never talks to Razorpay directly for buyer-side flows (there are none — buyers never pay online) and never sends WhatsApp messages itself (that's the storefront's job, triggered by buyer/enquiry actions, not admin actions).

Do not overbuild — this is an internal tool, not a customer-facing product. Prioritize function over polish; reuse whatever Tailwind/shadcn patterns exist before inventing new ones.

## 3. Tech stack

Same core stack as the storefront, installed fresh in this app:

- **Next.js (App Router)**, TypeScript, Tailwind CSS — scaffolded via `create-next-app`.
- **Clerk** (`@clerk/nextjs`) — installed and wired: `ClerkProvider` in `app/layout.tsx`, `proxy.ts` middleware (matcher includes `/__clerk/:path*`), `/sign-in` and `/sign-up` routes, sign-in/sign-up/user-button controls in the header. Uses the **same Clerk application** as the storefront (keys copied into `.env.local`) — do not create a second Clerk app for this.
- **Supabase** (`@supabase/supabase-js` only, no `@supabase/ssr`) — same reasoning as the storefront: Clerk manages auth, not Supabase Auth, so there's no cookie session to bridge. Two clients under `lib/supabase/`:
  - `client.ts` exports `supabase` — publishable key, RLS-respecting anon role.
  - `admin.ts` exports `supabaseAdmin` — secret key, bypasses RLS, guarded with `server-only`. This is the client most admin actions actually use (approve/reject products, edit any company/product, manage memberships) since admin operations are inherently privileged.
- Uses the **same Supabase project** as the storefront (`wpoikxdhzpzubionhkcw`) — this app reads and writes the same tables, it does not have its own database.

**Not yet set up here** (add only when actually needed): shadcn/ui component library, Zustand. The storefront has both; this app doesn't need them until a real UI/state need shows up — don't install preemptively.

## 4. Open decisions — do not silently assume

- **Route protection.** Right now every route is technically public at the Next.js level (Clerk components render conditionally, but nothing blocks a signed-out request from hitting a page or API route). This is an internal admin tool — every route should probably require a signed-in session, likely gated further to specific admin users/roles rather than "anyone with a Clerk account." Decide and implement this before any real data is exposed here; do not treat the current header-only UI as sufficient protection.
- **Per-user RLS.** Same open item as the storefront: there's no Clerk↔Supabase Third-Party Auth wiring yet. All privileged admin actions currently go through `supabaseAdmin` (bypasses RLS) from server code that should itself check the Clerk session — make sure every server action/route actually does that check, since `supabaseAdmin` alone enforces nothing.

## 5. Security

Never expose to browser code: `SUPABASE_SECRET_KEY`, `CLERK_SECRET_KEY`, or any Razorpay/WhatsApp credential this app might later read for display purposes (e.g. showing payment status) — those never belong in a client component regardless.

Every write to `products`, `companies`, `categories`, or `memberships` from this app must go through a server-checked route/action — never let a client component call `supabaseAdmin` directly.

## 6. When in doubt

1. Check the storefront's `AGENTS.md` first for shared product/data-model context.
2. Keep it small; this is an internal tool.
3. If a value's source isn't named here or in the storefront's `AGENTS.md`, that's an owed decision — ask rather than invent it.
4. Share exact test steps after implementing.
