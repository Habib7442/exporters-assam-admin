"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ChangeEvent, type SubmitEvent } from "react";

import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/category-actions";
import { ErrorDialog, runAction } from "@/components/error-dialog";

type Category = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);

  function handleImagePreview(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setNewImagePreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  // A plain onSubmit, not <form action={fn}>: same reset-on-submit-start
  // reasoning as the storefront's forms — matters more here since a file
  // input can't be controlled and would otherwise clear before the request
  // even completes.
  function handleCreate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const image = formData.get("image");
    startTransition(async () => {
      await runAction(
        () =>
          createCategory(
            String(formData.get("name") ?? ""),
            image instanceof File && image.size > 0 ? image : null,
          ),
        () => {
          createFormRef.current?.reset();
          setNewImagePreview(null);
          router.refresh();
        },
        setError,
      );
    });
  }

  function handleUpdate(event: SubmitEvent<HTMLFormElement>, categoryId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const image = formData.get("image");
    startTransition(async () => {
      await runAction(
        () =>
          updateCategory(
            categoryId,
            String(formData.get("name") ?? ""),
            image instanceof File && image.size > 0 ? image : null,
          ),
        () => {
          setEditingId(null);
          router.refresh();
        },
        setError,
      );
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await runAction(
        () => deleteCategory(id),
        () => router.refresh(),
        setError,
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={createFormRef} onSubmit={handleCreate} className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="name"
            required
            placeholder="Category name"
            className="h-9 flex-1 rounded-md border border-black/[.08] bg-transparent px-3 text-sm outline-none dark:border-white/[.145]"
          />
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImagePreview}
            className="text-xs"
          />
          {newImagePreview && (
            // eslint-disable-next-line @next/next/no-img-element -- internal tool, no image config needed for a plain preview
            <img src={newImagePreview} alt="New category preview" className="size-9 rounded-full object-cover" />
          )}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
          >
            {pending ? "Adding..." : "Add category"}
          </button>
        </div>
        <p className="text-xs text-zinc-400">Image optional — JPG, PNG, or WebP, up to 1 MB.</p>
      </form>
      <ErrorDialog message={error} onDismiss={() => setError(null)} />

      <div className="overflow-x-auto rounded-xl border border-black/[.08] dark:border-white/[.145]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-left text-xs text-zinc-500 uppercase dark:border-white/[.145]">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Products</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) =>
              editingId === category.id ? (
                <tr key={category.id} className="border-b border-black/[.08] last:border-0 dark:border-white/[.145]">
                  <td className="px-4 py-3" colSpan={4}>
                    <form
                      onSubmit={(event) => handleUpdate(event, category.id)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      {category.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- internal tool, no image config needed for a plain preview
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="size-9 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <input
                        name="name"
                        required
                        defaultValue={category.name}
                        className="h-9 flex-1 rounded-md border border-black/[.08] bg-transparent px-3 text-sm outline-none dark:border-white/[.145]"
                      />
                      <input
                        name="image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="text-xs"
                        title="Replace image — JPG, PNG, or WebP, up to 1 MB (optional)"
                      />
                      <button
                        type="submit"
                        disabled={pending}
                        className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-50"
                      >
                        {pending ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setEditingId(null)}
                        className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/[.145]"
                      >
                        Cancel
                      </button>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={category.id} className="border-b border-black/[.08] last:border-0 dark:border-white/[.145]">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {category.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- internal tool, no image config needed for a plain preview
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="size-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/[.04] text-[10px] text-zinc-400 dark:bg-white/[.06]">
                          No image
                        </div>
                      )}
                      {category.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{category.slug}</td>
                  <td className="px-4 py-3 text-zinc-500">{category.productCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setEditingId(category.id)}
                        className="text-xs font-medium disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleDelete(category.id)}
                        className="text-xs font-medium text-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
        {categories.length === 0 && <p className="p-6 text-sm text-zinc-500">No categories yet.</p>}
      </div>
    </div>
  );
}
