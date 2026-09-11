"use client";

import { useState, useTransition } from "react";

import { approveProduct, rejectProduct } from "@/lib/actions/product-approvals";
import { ErrorDialog, runAction } from "@/components/error-dialog";
import { formatDateTime } from "@/lib/format-date";

type PendingProductCardProps = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  galleryUrls: string[];
  categoryName: string | null;
  companyName: string;
  createdAt: string;
};

export function PendingProductCard(product: PendingProductCardProps) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  function handleApprove() {
    startTransition(async () => {
      await runAction(
        () => approveProduct(product.id),
        () => setDone("approved"),
        setError,
      );
    });
  }

  function handleReject() {
    startTransition(async () => {
      await runAction(
        () => rejectProduct(product.id, reason),
        () => setDone("rejected"),
        setError,
      );
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-black/[.08] p-4 text-sm text-zinc-500 dark:border-white/[.145]">
        {product.name} — {done}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex flex-col gap-1">
        <span className="font-semibold">{product.name}</span>
        <span className="text-xs text-zinc-500">
          {product.companyName}
          {product.categoryName ? ` · ${product.categoryName}` : ""}
          {product.galleryUrls.length > 1 ? ` · ${product.galleryUrls.length} images` : ""}
        </span>
        <span className="text-xs text-zinc-400">Submitted {formatDateTime(product.createdAt)}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {(product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl]).map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- internal tool, no image config needed for a plain preview
          <img
            key={url}
            src={url}
            alt={`${product.name} — image ${i + 1}`}
            className="size-40 shrink-0 rounded-lg border border-black/[.08] object-cover dark:border-white/[.145]"
          />
        ))}
      </div>

      {product.description && <p className="text-sm text-zinc-600 dark:text-zinc-400">{product.description}</p>}

      <ErrorDialog message={error} onDismiss={() => setError(null)} />

      {!rejecting ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={handleApprove}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {pending ? "Working..." : "Approve"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRejecting(true)}
            className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/[.145]"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being rejected? The supplier will see this."
            rows={2}
            className="w-full rounded-md border border-black/[.08] bg-transparent p-2 text-sm dark:border-white/[.145]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={handleReject}
              className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Working..." : "Confirm reject"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
              className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/[.145]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
