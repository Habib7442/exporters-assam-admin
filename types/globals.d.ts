// Types this admin app's own Clerk `publicMetadata` — set from the Clerk
// dashboard (Users → a user → Metadata → Public), read by
// lib/auth/admin.ts's isAdminUserId(). Redeclaring this global interface is
// Clerk's own documented pattern for typing user.publicMetadata.
export {};

declare global {
  interface UserPublicMetadata {
    role?: "admin";
  }
}
