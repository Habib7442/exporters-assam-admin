"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, useRef, useState, useTransition } from "react";

import { createAdminProduct, updateAdminProduct, type AdminProductResult } from "@/lib/actions/admin-product";
import { MAX_TOTAL_UPLOAD_BYTES, shrinkImage } from "@/lib/shrink-image";

type Category = { id: string; name: string };

/** An existing product being edited; absent when adding a new one. */
type EditedProduct = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  imageUrls: string[];
};

type AdminProductFormProps = {
  companyId: string;
  companyName: string;
  categories: Category[];
  product?: EditedProduct;
};

// Must match lib/image-upload.ts (server only, so not importable here).
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const INPUT_CLASS =
  "w-full rounded-md border border-[#E3E9DC] bg-white px-3 py-2 text-sm text-[#1A1F1A] outline-none focus:border-[#14532D] focus:ring-2 focus:ring-[#14532D]/20";

/**
 * Adds a product to one company (live immediately, PRD Section 4), or with
 * `product`, edits one; the product's status stays as it is.
 */
export function AdminProductForm({ companyId, companyName, categories, product }: AdminProductFormProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminProductResult | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  // Editing: which current images to keep, in their original order.
  const [keptUrls, setKeptUrls] = useState<string[]>(product?.imageUrls ?? []);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = product !== undefined;

  function handleImagesChange(event: ChangeEvent<HTMLInputElement>) {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews(Array.from(event.target.files ?? []).map((file) => URL.createObjectURL(file)));
  }

  function toggleKept(url: string) {
    if (!product) return;
    setKeptUrls((current) =>
      current.includes(url)
        ? current.filter((kept) => kept !== url)
        : product.imageUrls.filter((original) => original === url || current.includes(original)),
    );
  }

  function resetForm() {
    formRef.current?.reset();
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPreviews([]);
    setResult(null);
  }

  function imagesError(message: string) {
    setResult({ ok: false, message: "Please check the form.", fieldErrors: { images: message } });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);
    startTransition(async () => {
      // The same limits the server enforces (lib/image-upload.ts), checked
      // here first so the admin gets the right field error without
      // uploading anything. The count before shrinking, so nobody waits for
      // photos to be resized only to hear there are too many.
      const files = formData.getAll("images").filter((v): v is File => v instanceof File && v.size > 0);
      const total = (isEdit ? keptUrls.length : 0) + files.length;
      if (total === 0) return imagesError(isEdit ? "Keep or add at least one image." : "Add at least one image.");
      if (total > MAX_IMAGES) return imagesError(isEdit ? `Up to ${MAX_IMAGES} images in total.` : `Up to ${MAX_IMAGES} images.`);
      // Shrink big photos first: all images travel in one request, which
      // must stay under the server action body limit.
      const images = await Promise.all(files.map((file) => shrinkImage(file)));
      // shrinkImage keeps the original when it can't decode a file, and a
      // PNG can stay large after re-encoding, so check each result too.
      if (images.some((file) => file.size > MAX_IMAGE_BYTES)) return imagesError("Each image must be under 2 MB.");
      if (images.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_UPLOAD_BYTES) {
        return imagesError("These images are too large together. Try fewer or smaller images.");
      }

      const details = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        categoryId: String(formData.get("categoryId") ?? ""),
      };
      try {
        setResult(
          isEdit
            ? await updateAdminProduct({ ...details, productId: product.id, keepImageUrls: keptUrls, newImages: images })
            : await createAdminProduct({ ...details, companyId, images }),
        );
      } catch {
        setResult({ ok: false, message: "Couldn't save the product. Check your connection and try again." });
      }
    });
  }

  if (result?.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-[#E3E9DC] bg-white p-6 text-sm">
        <h3 className="text-base font-semibold text-[#14532D]">{isEdit ? "Changes saved" : "Product added and live"}</h3>
        <p className="text-[#5B6B57]">
          {isEdit ? "The product is updated." : `It now shows on ${companyName}'s page.`} The public site&apos;s cached
          pages pick it up within 5 minutes.
        </p>
        <div className="flex flex-wrap gap-2">
          {!isEdit && (
            <button type="button" onClick={resetForm} className="rounded-full bg-[#14532D] px-4 py-1.5 text-sm font-medium text-white">
              Add another product
            </button>
          )}
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
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={product?.name}
          placeholder="e.g. Assam Agarwood Chips, Grade A"
          className={INPUT_CLASS}
        />
        {fieldErrors?.name && <span className="text-xs text-red-700">{fieldErrors.name}</span>}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-[#1A1F1A]">Category</span>
        <select name="categoryId" required defaultValue={product?.categoryId ?? ""} className={INPUT_CLASS}>
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
        <textarea
          name="description"
          rows={3}
          maxLength={2000}
          defaultValue={product?.description ?? undefined}
          placeholder="Grade, pack size, origin..."
          className={INPUT_CLASS}
        />
      </label>

      {isEdit && product.imageUrls.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium text-[#1A1F1A]">Current images</span>
          <span className="text-xs text-[#5B6B57]">Click an image to remove it, click again to keep it. The first image kept is the main photo.</span>
          <div className="flex flex-wrap gap-2">
            {product.imageUrls.map((url, i) => {
              const kept = keptUrls.includes(url);
              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => toggleKept(url)}
                  aria-pressed={!kept}
                  aria-label={kept ? `Remove image ${i + 1}` : `Keep image ${i + 1}`}
                  className={`relative size-16 overflow-hidden rounded-lg border ${kept ? "border-[#E3E9DC]" : "border-red-300"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- internal tool preview */}
                  <img src={url} alt="" className={kept ? "size-full object-cover" : "size-full object-cover opacity-30"} />
                  {!kept && <span className="absolute inset-x-0 bottom-0 bg-red-600 text-[10px] font-medium text-white">Removed</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-[#1A1F1A]">{isEdit ? "Add images" : "Images"}</span>
        <input
          name="images"
          type="file"
          multiple
          required={!isEdit}
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImagesChange}
          className="text-sm"
        />
        <span className="text-xs text-[#5B6B57]">
          {isEdit
            ? `JPG, PNG, or WebP. Up to ${MAX_IMAGES} images in total, counting the ones you keep.`
            : "JPG, PNG, or WebP, up to 5 images. The first is the main photo. Large photos are resized automatically."}
        </span>
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
          {pending ? (isEdit ? "Saving..." : "Adding...") : isEdit ? "Save changes" : "Add product (goes live now)"}
        </button>
      </div>
    </form>
  );
}
