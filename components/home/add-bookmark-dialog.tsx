"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { BookmarkListItem } from "@/lib/db/repositories/bookmarks";
import type { CategoryListItem } from "@/lib/db/repositories/categories";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type BookmarkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryListItem[];
  onSaved: () => Promise<void>;
  editingBookmark?: BookmarkListItem | null;
};

type BookmarkFormState = {
  url: string;
  title: string;
  description: string;
  tags: string;
  categoryId: string;
};

const emptyBookmarkForm: BookmarkFormState = {
  url: "",
  title: "",
  description: "",
  tags: "",
  categoryId: ""
};

export default function BookmarkDialog({
  open,
  onOpenChange,
  categories,
  onSaved,
  editingBookmark
}: BookmarkDialogProps) {
  const [form, setForm] = useState<BookmarkFormState>(emptyBookmarkForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = Boolean(editingBookmark);

  const parsedTags = useMemo(
    () =>
      form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [form.tags]
  );

  useEffect(() => {
    if (editingBookmark) {
      setForm({
        url: editingBookmark.url,
        title: editingBookmark.title,
        description: editingBookmark.description || "",
        tags: editingBookmark.tags.join(", "),
        categoryId: editingBookmark.categoryId ? String(editingBookmark.categoryId) : ""
      });
    } else {
      setForm({ ...emptyBookmarkForm });
    }
    setError(null);
  }, [editingBookmark, open]);

  function resetState() {
    setForm({ ...emptyBookmarkForm });
    setError(null);
    setSubmitting(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      const selectedCategoryId = form.categoryId ? Number(form.categoryId) : null;
      const normalizedCategoryId =
        selectedCategoryId !== null && Number.isInteger(selectedCategoryId) && selectedCategoryId > 0
          ? selectedCategoryId
          : null;
      const isEditing = isEditMode && editingBookmark;
      const endpoint = isEditing ? `/api/bookmarks/${editingBookmark.id}` : "/api/bookmarks";
      const method = isEditing ? "PATCH" : "POST";
      const defaultErrorMessage = isEditing ? "Failed to update bookmark" : "Failed to create bookmark";
      const payloadBody = {
        url: form.url,
        title: form.title || undefined,
        description: form.description || undefined,
        categoryId: normalizedCategoryId,
        tags: isEditing ? parsedTags : parsedTags.length > 0 ? parsedTags : undefined
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payloadBody)
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? defaultErrorMessage);
      }

      await onSaved();
      onOpenChange(false);
      resetState();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save bookmark");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-[#151c26]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined">bookmark</span>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isEditMode ? "Edit Bookmark" : "Add New Bookmark"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {isEditMode ? "Update link, category and tags." : "Save link, category and tags in one place."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form className="space-y-5 p-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="url-input">
              URL <span className="text-red-500">*</span>
            </label>
            <div className="group relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <span className="material-symbols-outlined text-[20px]">link</span>
              </div>
              <input
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-10 pr-4 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                id="url-input"
                onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="https://example.com"
                required
                type="url"
                value={form.url}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="name-input">
              Name
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
              id="name-input"
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="e.g. My Favorite Design Blog"
              type="text"
              value={form.title}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="category-select">
              Category
            </label>
            <select
              className="w-full appearance-none rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
              id="category-select"
              onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
              value={form.categoryId}
            >
              <option value="">No Category</option>
              {categories.map((category) => (
                <option key={category.id} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="description-input">
              Description
            </label>
            <textarea
              className="min-h-24 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
              id="description-input"
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Quick description about this bookmark"
              value={form.description}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="tags-input">
              Tags
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
              id="tags-input"
              onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder="design, ui, inspiration"
              type="text"
              value={form.tags}
            />
            {parsedTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {parsedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-primary/30 bg-primary/20 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-0 pt-4 dark:border-slate-800 dark:bg-[#151c26]">
            <button
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => handleOpenChange(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              {submitting ? "Saving..." : isEditMode ? "Update Bookmark" : "Save Bookmark"}
            </button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
}
