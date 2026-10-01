"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useRef, useState, useTransition } from "react";

import { createAdminProduct, type AdminProductResult } from "@/lib/actions/admin-product";
import { MAX_TOTAL_UPLOAD_BYTES, shrinkImage } from "@/lib/shrink-image";

type Category = { id: string; name: string };

const INPUT_CLASS =
  "w-full rounded-md border border-[#E3E9DC] bg-white px-3 py-2 text-sm text-[#1A1F1A] outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20";

/** Adds a product to one company; it goes live immediately (PRD Section 4). */
export function AdminProductForm({ companyId, companyName, categories }: { companyId: string; companyName: string; categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminProductResult | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(Array.from(event.target.files ?? []).map((file) => URL.createObjectURL(file)));
  }

  function resetForm() {
    formRef.current?.reset();
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setResult(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);
    startTransition(async () => {
      // Shrink big photos first: all images travel in one request, which
      // must stay under the server action body limit.
      const images = await Promise.all(
        formData
          .getAll("images")
          .filter((v): v is File => v instanceof File && v.size > 0)
          .map((file) => shrinkImage(file)),
      );
      if (images.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_UPLOAD_BYTES) {
        setResult({
          ok: false,
          message: "Please check the form.",
          fieldErrors: { images: "These images are too large together. Try fewer or smaller images." },
        });
        return;
      }
      try {
        setResult(
          await createAdminProduct({
            companyId,
            name: String(formData.get("name") ?? ""),
            description: String(formData.get("description") ?? ""),
            categoryId: String(formData.get("categoryId") ?? ""),
            images,
          }),
        );
      } catch {
        setResult({ ok: false, message: "Couldn't save the product. Check your connection and try again." });
      }
    });
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm">
        <h3 className="text-base font-semibold text-[#14532D]">Product added and live</h3>
        <p className="text-[#5B6B57]">
          It now shows on {companyName}&apos;s page. The public site&apos;s cached pages pick it up within 5 minutes.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-full bg-[#14532D] px-4 py-1.5 text-sm font-medium text-white"
          >
            Add another product
          </button>
          <Link href={`/companies/${companyId}`} className="rounded-full border border-[#E3E9DC] px-4 py-1.5 text-sm font-medium">
            Back to {companyName}
          </Link>
        </div>
      </div>
    );
  }

  const fieldErrors = result && !result.ok ? result.fieldErrors : undefined;
  const topError = result && !result.ok && !result.fieldErrors ? result.message : null;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm">
      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-[#1A1F1A]">Product name</span>
        <input name="name" required maxLength={200} placeholder="e.g. Assam Agarwood Chips, Grade A" className={INPUT_CLASS} />
        {fieldErrors?.name && <span className="text-xs text-red-700">{fieldErrors.name}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-[#1A1F1A]">Category</span>
        <select name="categoryId" required defaultValue="" className={INPUT_CLASS}>
          <option value="" disabled>
            Select a category
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {fieldErrors?.categoryId && <span className="text-xs text-red-700">{fieldErrors.categoryId}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-[#1A1F1A]">
          Description <span className="font-normal text-[#5B6B57]">(optional)</span>
        </span>
        <textarea name="description" rows={3} maxLength={2000} placeholder="Grade, pack size, origin..." className={INPUT_CLASS} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-[#1A1F1A]">Images</span>
        <input
          name="images"
          type="file"
          multiple
          required
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImagesChange}
          className="text-sm"
        />
        <span className="text-xs text-[#5B6B57]">JPG, PNG, or WebP, up to 5 images. The first is the main photo. Large photos are resized automatically.</span>
        {fieldErrors?.images && <span className="text-xs text-red-700">{fieldErrors.images}</span>}
        {previews.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- local file preview
              <img key={src} src={src} alt={`Preview ${i + 1}`} className="size-16 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </label>

      {topError && <p className="text-sm text-red-700">{topError}</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#14532D] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Adding..." : "Add product (goes live now)"}
        </button>
      </div>
    </form>
  );
}
