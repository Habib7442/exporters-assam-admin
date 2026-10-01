"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";

type SearchInputProps = {
  placeholder?: string;
  /** Wait this long after the last keystroke before updating the URL. */
  debounceMs?: number;
};

/**
 * A debounced, URL driven search box: typing updates `?q=` (router.replace,
 * so no history entry per keystroke) once the admin stops typing, and the
 * server page filters on it. The URL is the source of truth, so a search
 * survives a refresh and can be shared. Shows a spinner while the filtered
 * page loads.
 */
export function SearchInput({ placeholder = "Search...", debounceMs = 300 }: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedParams = searchParams.toString();
  const urlValue = searchParams.get("q") ?? "";

  const [value, setValue] = useState(urlValue);
  const [syncedUrlValue, setSyncedUrlValue] = useState(urlValue);
  // The last value this box itself sent to the URL.
  const [issuedValue, setIssuedValue] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Follow outside URL changes (back/forward, a link) without fighting the
  // admin's own typing: adjusted during render, React's "adjusting state
  // when a prop changes" pattern, not in an effect. When the URL change is
  // the box's own search arriving, the text is left alone: the admin may
  // have kept typing ("car" sent, "cart" typed since), and resetting it
  // would drop that draft and cancel its pending update.
  if (urlValue !== syncedUrlValue) {
    setSyncedUrlValue(urlValue);
    if (urlValue !== issuedValue) setValue(urlValue);
    setIssuedValue(null);
  }

  useEffect(() => {
    if (value.trim() === urlValue.trim()) return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams(serializedParams);
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      setIssuedValue(trimmed);
      startTransition(() => {
        router.replace(params.size > 0 ? `${pathname}?${params.toString()}` : pathname);
      });
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [value, urlValue, debounceMs, pathname, router, serializedParams]);

  return (
    <div className="relative w-full max-w-md">
      {isPending ? (
        <Loader2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-[#5B6B57]" aria-hidden="true" />
      ) : (
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#5B6B57]" aria-hidden="true" />
      )}
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-busy={isPending}
        className="h-10 w-full rounded-full border border-[#E3E9DC] bg-white pr-4 pl-9 text-sm text-[#1A1F1A] outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20"
      />
    </div>
  );
}
