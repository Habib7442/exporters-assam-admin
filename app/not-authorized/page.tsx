export default function NotAuthorizedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1 className="text-xl font-semibold">Not authorized</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your account isn&apos;t on the admin allowlist for this dashboard.
      </p>
    </main>
  );
}
