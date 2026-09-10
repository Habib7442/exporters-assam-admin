"use client";

import { useState, useTransition } from "react";

import { approveCompany, rejectCompany } from "@/lib/actions/company-approvals";

type PendingCompanyCardProps = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  country: string;
  logoUrl: string | null;
  about: string | null;
  email: string;
  whatsappNumber: string | null;
  createdAt: string;
};

export function PendingCompanyCard(company: PendingCompanyCardProps) {
  const [pending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "rejected" | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveCompany(company.id);
      if (!result.ok) setError(result.message);
      else setDone("approved");
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectCompany(company.id, reason);
      if (!result.ok) setError(result.message);
      else setDone("rejected");
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border border-black/[.08] p-4 text-sm text-zinc-500 dark:border-white/[.145]">
        {company.name} — {done}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{company.name}</span>
          <span className="text-xs text-zinc-500">
            {company.location ?? company.country} · {company.email}
            {company.whatsappNumber ? ` · ${company.whatsappNumber}` : ""}
          </span>
          <span className="text-xs text-zinc-400">
            Submitted {new Date(company.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {company.about && <p className="text-sm text-zinc-600 dark:text-zinc-400">{company.about}</p>}

      {error && <p className="text-sm text-red-600">{error}</p>}

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
