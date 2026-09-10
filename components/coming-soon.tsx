export function ComingSoon({ what }: { what: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="text-sm text-[#5B6B57]">{what} isn&apos;t built yet.</p>
    </main>
  );
}
