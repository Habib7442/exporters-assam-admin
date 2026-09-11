"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { approveCompany, rejectCompany } from "@/lib/actions/company-approvals";
import { ErrorDialog, runAction } from "@/components/error-dialog";

export function CompanyDetailActions({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    startTransition(async () => {
      await runAction(
        () => approveCompany(companyId),
        () => router.refresh(),
        setError,
      );
    });
  }

  function handleReject() {
    startTransition(async () => {
      await runAction(
        () => rejectCompany(companyId, reason),
        () => {
          setRejecting(false);
          setReason("");
          router.refresh();
        },
        setError,
      );
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#E3E9DC] bg-white p-4">
      <ErrorDialog message={error} onDismiss={() => setError(null)} />

      {!rejecting ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={handleApprove}
            className="rounded-full bg-[#14532D] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Working..." : "Approve"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRejecting(true)}
            className="rounded-full border border-[#E3E9DC] px-4 py-1.5 text-sm font-medium disabled:opacity-50"
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
            className="w-full rounded-md border border-[#E3E9DC] bg-transparent p-2 text-sm"
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
              className="rounded-full border border-[#E3E9DC] px-4 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
