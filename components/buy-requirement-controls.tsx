"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteBuyRequirement,
  takeDownBuyRequirement,
  type ModerationResult,
} from "@/lib/actions/buy-requirement-moderation";
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

type Confirming = "takeDown" | "delete" | null;

/** "Take off site" (public only) and a confirmed permanent "Delete" for one buy requirement. */
export function BuyRequirementControls({ id, isPublic, label }: { id: string; isPublic: boolean; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ModerationResult>) {
    startTransition(async () => {
      await runAction(
        action,
        () => {
          setConfirming(null);
          router.refresh();
        },
        setError,
      );
    });
  }

  const copy =
    confirming === "takeDown"
      ? {
          title: "Take this buy requirement off the site?",
          body: `"${label}" will stop showing publicly straight away. It can't be made public again from here, so delete it instead if it's spam.`,
          button: "Take off site",
          action: () => takeDownBuyRequirement(id),
        }
      : {
          title: "Delete this buy requirement permanently?",
          body: `"${label}" and the buyer's details on it will be removed for good. Enquiries that replied to it stay, without the link. This can't be undone.`,
          button: "Delete",
          action: () => deleteBuyRequirement(id),
        };

  return (
    <div className="flex flex-wrap gap-2">
      <ErrorDialog message={error} onDismiss={() => setError(null)} />

      {isPublic && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming("takeDown")}
          className="rounded-full border border-[#E3E9DC] px-3 py-1 text-xs font-medium disabled:opacity-50"
        >
          Take off site
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming("delete")}
        className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 disabled:opacity-50"
      >
        Delete
      </button>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => !open && !pending && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(copy.action)}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${confirming === "delete" ? "bg-red-600" : "bg-[#14532D]"}`}
            >
              {pending ? "Working..." : copy.button}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
