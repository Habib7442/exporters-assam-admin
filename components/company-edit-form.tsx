"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

import { updateAdminCompany, type AdminCompanyInput, type AdminCompanyResult } from "@/lib/actions/admin-company";
import { shrinkImage } from "@/lib/shrink-image";

type CompanyValues = Omit<AdminCompanyInput, "companyId" | "logo"> & { logoUrl: string | null };

const INPUT_CLASS =
  "w-full rounded-md border border-[#E3E9DC] bg-white px-3 py-2 text-sm text-[#1A1F1A] outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20";

type TextField = Exclude<keyof CompanyValues, "logoUrl">;

const FIELDS: { name: TextField; label: string; required?: boolean; type?: string; wide?: boolean; textarea?: boolean }[] = [
  { name: "name", label: "Business name", required: true, wide: true },
  { name: "addressLine", label: "Address", wide: true },
  { name: "location", label: "City", required: true },
  { name: "state", label: "State" },
  { name: "postalCode", label: "PIN code" },
  { name: "country", label: "Country", required: true },
  { name: "email", label: "Email", required: true, type: "email" },
  { name: "whatsappNumber", label: "WhatsApp number", required: true, type: "tel" },
  { name: "gstNumber", label: "GST number" },
  { name: "about", label: "About", wide: true, textarea: true },
];

/** Edits a company's details, WhatsApp number and logo; status, verified flag and slug stay as they are. */
export function CompanyEditForm({ companyId, values }: { companyId: string; values: CompanyValues }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminCompanyResult | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);
    startTransition(async () => {
      const picked = formData.get("logo");
      const logo = picked instanceof File && picked.size > 0 ? await shrinkImage(picked) : null;
      if (logo && logo.size > 2 * 1024 * 1024) {
        setResult({ ok: false, message: "Please check the form.", fieldErrors: { logo: "The logo must be under 2 MB." } });
        return;
      }
      const text = (name: TextField) => String(formData.get(name) ?? "");
      try {
        setResult(
          await updateAdminCompany({
            companyId,
            name: text("name"),
            addressLine: text("addressLine"),
            location: text("location"),
            state: text("state"),
            postalCode: text("postalCode"),
            country: text("country"),
            email: text("email"),
            whatsappNumber: text("whatsappNumber"),
            gstNumber: text("gstNumber"),
            about: text("about"),
            logo,
          }),
        );
      } catch {
        setResult({ ok: false, message: "Couldn't save the changes. Check your connection and try again." });
      }
    });
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm">
        <h3 className="text-base font-semibold text-[#14532D]">Changes saved</h3>
        <p className="text-[#5B6B57]">The public site&apos;s cached pages pick them up within 5 minutes.</p>
        <div>
          <Link href={`/companies/${companyId}`} className="rounded-full border border-[#E3E9DC] px-4 py-1.5 text-sm font-medium">
            Back to the company
          </Link>
        </div>
      </div>
    );
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;
  const topError = result && !result.ok && !result.fieldErrors ? result.message : null;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm sm:grid-cols-2">
      {FIELDS.map((field) => (
        <label key={field.name} className={`flex flex-col gap-1.5 ${field.wide ? "sm:col-span-2" : ""}`}>
          <span className="font-medium text-[#1A1F1A]">
            {field.label} {!field.required && <span className="font-normal text-[#5B6B57]">(optional)</span>}
          </span>
          {field.textarea ? (
            <textarea name={field.name} rows={4} maxLength={2000} defaultValue={values[field.name]} className={INPUT_CLASS} />
          ) : (
            <input
              name={field.name}
              type={field.type ?? "text"}
              required={field.required}
              defaultValue={values[field.name]}
              className={INPUT_CLASS}
            />
          )}
          {field.name === "whatsappNumber" && (
            <span className="text-xs text-[#5B6B57]">With country code, e.g. +91 98765 43210. A 10 digit number is saved as an Indian (+91) number.</span>
          )}
          {fieldErrors?.[field.name] && <span className="text-xs text-red-700">{fieldErrors[field.name]}</span>}
        </label>
      ))}

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="font-medium text-[#1A1F1A]">Logo</span>
        <div className="flex items-center gap-3">
          {values.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- internal tool preview
            <img src={values.logoUrl} alt="Current logo" className="size-14 rounded-lg border border-[#E3E9DC] object-cover" />
          )}
          <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
        </div>
        <span className="text-xs text-[#5B6B57]">Choose a file only to replace the logo. JPG, PNG, or WebP, under 2 MB.</span>
        {fieldErrors?.logo && <span className="text-xs text-red-700">{fieldErrors.logo}</span>}
      </div>

      {topError && <p className="text-sm text-red-700 sm:col-span-2">{topError}</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#14532D] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
