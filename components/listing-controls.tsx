"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteCompanyPermanently,
  deleteProductPermanently,
  hideCompany,
  hideProduct,
  unhideCompany,
  unhideProduct,
  type ManagementResult,
} from "@/lib/actions/listing-management";
import { ErrorDialog, runAction } from "@/components/error-dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ListingControlsProps = {
  kind: "product" | "company";
  id: string;
  name: string;
  status: string;
  /** Smaller buttons for a table row. */
  compact?: boolean;
};

const ACTIONS = {
  product: { hide: hideProduct, unhide: unhideProduct, remove: deleteProductPermanently },
  company: { hide: hideCompany, unhide: unhideCompany, remove: deleteCompanyPermanently },
};

/**
 * Hide / Unhide (approved ↔ hidden) and a confirmed permanent Delete for one
 * product or company (storefront spec 0007). Changes reach the public site
 * within its 5 minute page cache.
 */
export function ListingControls({ kind, id, name, status, compact = false }: ListingControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actions = ACTIONS[kind];

  function run(action: () => Promise<ManagementResult>, onDone?: () => void) {
    startTransition(async () => {
      await runAction(
        action,
        () => {
          onDone?.();
          router.refresh();
        },
        setError,
      );
    });
  }

  const size = compact ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm";
  const deleteWarning =
    kind === "company"
      ? `"${name}", all its products, their images and its logo will be removed for good. Buyer enquiries stay, without the link. This can't be undone; use Hide for a temporary take down.`
      : `"${name}" and its images will be removed for good. Buyer enquiries stay, without the link. This can't be undone; use Hide for a temporary take down.`;

  return (
    <div className="flex flex-wrap gap-2">
      <ErrorDialog message={error} onDismiss={() => setError(null)} />

      {status === "approved" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => actions.hide(id))}
          className={`rounded-full border border-[#E3E9DC] font-medium disabled:opacity-50 ${size}`}
        >
          {pending ? "Working..." : "Hide"}
        </button>
      )}
      {status === "hidden" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => actions.unhide(id))}
          className={`rounded-full bg-[#14532D] font-medium text-white disabled:opacity-50 ${size}`}
        >
          {pending ? "Working..." : "Unhide"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirmingDelete(true)}
        className={`rounded-full border border-red-200 font-medium text-red-700 disabled:opacity-50 ${size}`}
      >
        Delete
      </button>

      <AlertDialog open={confirmingDelete} onOpenChange={(open) => !pending && setConfirmingDelete(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {kind} permanently?</AlertDialogTitle>
            <AlertDialogDescription>{deleteWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => actions.remove(id),
                  () => {
                    setConfirmingDelete(false);
                    if (kind === "company") router.push("/companies");
                  },
                )
              }
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Deleting..." : `Delete ${kind}`}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
