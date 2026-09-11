"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ErrorDialogProps = {
  message: string | null
  onDismiss: () => void
}

/**
 * A single, reusable way to surface an error to the admin — a shadcn Alert
 * Dialog, not a quiet inline line of red text (easy to miss) or Next's raw
 * dev/runtime error overlay (meaningless to anyone but a developer). Any
 * client component with an `error: string | null` state renders this once
 * and passes it through; `message: null` renders nothing.
 */
export function ErrorDialog({ message, onDismiss }: ErrorDialogProps) {
  return (
    <AlertDialog open={message !== null} onOpenChange={(open) => !open && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Something went wrong</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onDismiss}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Turns anything a server action call can produce — a normal `{ ok: false }`
 * result, or a thrown exception the framework surfaces (a body-size limit,
 * a network error, an unexpected server crash) — into one plain message
 * string for `ErrorDialog`. Never lets a thrown error propagate unhandled
 * to the browser.
 */
export async function runAction<T extends { ok: boolean; message?: string }>(
  action: () => Promise<T>,
  onSuccess: (result: T) => void,
  onError: (message: string) => void,
): Promise<void> {
  try {
    const result = await action()
    if (!result.ok) {
      onError(result.message ?? "Something went wrong. Please try again.")
      return
    }
    onSuccess(result)
  } catch (err) {
    onError(
      err instanceof Error
        ? err.message
        : "Something went wrong on our end. Please try again in a moment.",
    )
  }
}
