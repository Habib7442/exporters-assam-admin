"use client";

import { useState, useTransition } from "react";

import { setCompanyPlan } from "@/lib/actions/set-company-plan";
import { ErrorDialog, runAction } from "@/components/error-dialog";

const PLANS = [
  { value: "basic", label: "Basic (free)" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
] as const;

type CompanyPlanControlProps = {
  companyId: string;
  companyName: string;
  tier: string;
};

/** Pick a plan and save it, with a confirm step so a misclick can't change a paid plan. */
export function CompanyPlanControl({ companyId, companyName, tier }: CompanyPlanControlProps) {
  const [selected, setSelected] = useState(tier);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const changed = selected !== tier;

  function handleSave() {
    const label = PLANS.find((plan) => plan.value === selected)?.label ?? selected;
    const note = selected === "basic" ? "This ends their paid plan." : "This starts a one year plan from today.";
    if (!window.confirm(`Set ${companyName} to ${label}? ${note}`)) return;

    startTransition(async () => {
      await runAction(() => setCompanyPlan(companyId, selected), () => {}, (message) => {
        setError(message);
        setSelected(tier);
      });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selected}
        disabled={pending}
        onChange={(event) => setSelected(event.target.value)}
        aria-label={`Plan for ${companyName}`}
        className="rounded-md border border-[#E3E9DC] bg-white px-2 py-1.5 text-sm disabled:opacity-50"
      >
        {PLANS.map((plan) => (
          <option key={plan.value} value={plan.value}>
            {plan.label}
          </option>
        ))}
      </select>
      {changed && (
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="rounded-full bg-[#14532D] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save"}
        </button>
      )}
      <ErrorDialog message={error} onDismiss={() => setError(null)} />
    </div>
  );
}
