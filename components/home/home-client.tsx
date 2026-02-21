"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import AddBookmarkDialog from "@/components/home/add-bookmark-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { BookmarkListItem } from "@/lib/db/repositories/bookmarks";
import type { CategoryListItem } from "@/lib/db/repositories/categories";

type HomeClientProps = {
  initialBookmarks: BookmarkListItem[];
  initialCategories: CategoryListItem[];
  user: {
    username: string;
    email: string;
  };
};

type ActiveCategory = "all" | "uncategorized" | number;

const iconStyles = [
  "bg-[#282f39]",
  "bg-[#ea4c89]",
  "bg-black",
  "bg-[#0A66C2]",
  "bg-gradient-to-br from-purple-500 to-pink-500",
  "bg-[#F24E1E]",
  "bg-emerald-600"
];
const THEME_STORAGE_KEY = "bookmark-theme";

function formatRelativeTime(timestamp: number) {
  const seconds = Math.max(1, Math.floor(Date.now() / 1000) - timestamp);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function categoryTitle(activeCategory: ActiveCategory, categories: CategoryListItem[]) {
  if (activeCategory === "all") {
    return "All Bookmarks";
  }

  if (activeCategory === "uncategorized") {
    return "Uncategorized";
  }

  return categories.find((category) => category.id === activeCategory)?.name ?? "Unknown Category";
}

function userInitials(username: string) {
  const clean = username.trim();
  if (!clean) {
    return "U";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

export default function HomeClient({ initialBookmarks, initialCategories, user }: HomeClientProps) {
  const router = useRouter();

  const [bookmarks, setBookmarks] = useState<BookmarkListItem[]>(initialBookmarks);
  const [categories, setCategories] = useState<CategoryListItem[]>(initialCategories);
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("all");
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<"create" | "edit">("create");
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryListItem | null>(null);
  const [categoryDeleteSubmitting, setCategoryDeleteSubmitting] = useState(false);
  const [bookmarkMenuId, setBookmarkMenuId] = useState<number | null>(null);
  const [bookmarkToDelete, setBookmarkToDelete] = useState<BookmarkListItem | null>(null);
  const [bookmarkDeleteSubmitting, setBookmarkDeleteSubmitting] = useState(false);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const uncategorizedCount = useMemo(
    () => bookmarks.filter((item) => item.categoryId === null).length,
    [bookmarks]
  );

  const filteredBookmarks = useMemo(() => {
    if (activeCategory === "all") {
      return bookmarks;
    }

    if (activeCategory === "uncategorized") {
      return bookmarks.filter((item) => item.categoryId === null);
    }

    return bookmarks.filter((item) => item.categoryId === activeCategory);
  }, [activeCategory, bookmarks]);

  async function reloadData() {
    const [bookmarksResponse, categoriesResponse] = await Promise.all([
      fetch("/api/bookmarks", { cache: "no-store" }),
      fetch("/api/categories", { cache: "no-store" })
    ]);

    const bookmarksPayload = (await bookmarksResponse.json()) as {
      data?: BookmarkListItem[];
      error?: string;
    };
    const categoriesPayload = (await categoriesResponse.json()) as {
      data?: CategoryListItem[];
      error?: string;
    };

    if (!bookmarksResponse.ok) {
      throw new Error(bookmarksPayload.error ?? "Failed to load bookmarks");
    }

    if (!categoriesResponse.ok) {
      throw new Error(categoriesPayload.error ?? "Failed to load categories");
    }

    setBookmarks(bookmarksPayload.data ?? []);
    setCategories(categoriesPayload.data ?? []);
    setBookmarkMenuId(null);
  }

  function openCreateCategoryModal() {
    setCategoryModalMode("create");
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryError(null);
    setCategoryModalOpen(true);
  }

  function openEditCategoryModal(category: CategoryListItem) {
    setCategoryModalMode("edit");
    setEditingCategoryId(category.id);
    setCategoryName(category.name);
    setCategoryError(null);
    setCategoryModalOpen(true);
  }

  async function handleCategorySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCategorySubmitting(true);
    setCategoryError(null);
    setGlobalError(null);

    try {
      const isEdit = categoryModalMode === "edit" && editingCategoryId !== null;
      const endpoint = isEdit ? `/api/categories/${editingCategoryId}` : "/api/categories";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: categoryName })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save category");
      }

      await reloadData();
      setCategoryModalOpen(false);
      setCategoryName("");
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "Failed to save category");
    } finally {
      setCategorySubmitting(false);
    }
  }

  function openDeleteCategoryDialog(category: CategoryListItem) {
    if (category.bookmarkCount > 0) {
      return;
    }

    setCategoryToDelete(category);
  }

  async function confirmDeleteCategory() {
    if (!categoryToDelete) {
      return;
    }

    setCategoryDeleteSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: "DELETE"
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete category");
      }

      await reloadData();
      if (activeCategory === categoryToDelete.id) {
        setActiveCategory("all");
      }
      setCategoryToDelete(null);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setCategoryDeleteSubmitting(false);
    }
  }

  function openDeleteBookmarkDialog(bookmark: BookmarkListItem) {
    setBookmarkToDelete(bookmark);
  }

  async function confirmDeleteBookmark() {
    if (!bookmarkToDelete) {
      return;
    }

    setBookmarkDeleteSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch(`/api/bookmarks/${bookmarkToDelete.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete bookmark");
      }

      await reloadData();
      setBookmarkToDelete(null);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Failed to delete bookmark");
    }
    finally {
      setBookmarkDeleteSubmitting(false);
    }
  }

  async function handleLogout() {
    setLogoutSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to logout");
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Failed to logout");
      setLogoutSubmitting(false);
    }
  }

  function applyTheme(nextTheme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch (_error) {}
    setTheme(nextTheme);
  }

  function toggleTheme() {
    applyTheme(theme === "dark" ? "light" : "dark");
  }

  return (
    <>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100 md:flex-row">
        <aside className="z-20 flex w-full shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111418] md:w-64 lg:w-72">
          <div className="flex items-center gap-3 border-b border-slate-200 p-6 dark:border-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <span className="material-symbols-outlined text-[20px]">bookmarks</span>
            </div>
            <span className="text-lg font-bold tracking-tight">Bookmarker</span>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-4">
            <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Library</p>
            <nav className="space-y-1">
              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeCategory === "all"
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
                onClick={() => setActiveCategory("all")}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">inbox</span>
                <span>All Bookmarks</span>
                <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs text-white">{bookmarks.length}</span>
              </button>

              <button
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeCategory === "uncategorized"
                    ? "bg-primary/10 text-primary"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
                onClick={() => setActiveCategory("uncategorized")}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">question_mark</span>
                <span>Uncategorized</span>
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{uncategorizedCount}</span>
              </button>

            </nav>

            <div className="mb-4 mt-8 flex items-center justify-between px-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Categories</p>
              <button
                className="rounded p-1 text-slate-500 transition-colors hover:text-primary"
                onClick={openCreateCategoryModal}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>

            <nav className="space-y-1">
              {categories.length === 0 ? (
                <p className="px-2 text-sm text-slate-500">No categories yet</p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
                      activeCategory === category.id ? "bg-primary/10" : "hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <button
                      className={`flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left text-sm font-medium transition-colors ${
                        activeCategory === category.id
                          ? "text-primary"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                      onClick={() => setActiveCategory(category.id)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">folder</span>
                      <span className="truncate">{category.name}</span>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-xs ${
                          activeCategory === category.id
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {category.bookmarkCount}
                      </span>
                    </button>

                    <button
                      className="rounded p-1 text-slate-400 transition-colors hover:text-slate-100"
                      onClick={() => openEditCategoryModal(category)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>

                    <div className="group relative">
                      <button
                        aria-disabled={category.bookmarkCount > 0}
                        className={`rounded p-1 transition-colors ${
                          category.bookmarkCount > 0
                            ? "cursor-not-allowed text-slate-600/40 dark:text-slate-500/40"
                            : "text-slate-400 hover:text-red-300"
                        }`}
                        onClick={() => openDeleteCategoryDialog(category)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                      {category.bookmarkCount > 0 ? (
                        <div className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-52 rounded-md bg-slate-900 px-2 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-700">
                          当前分类包含书签，不能删除
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </nav>
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-lg p-2">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-300 text-xs font-semibold text-slate-800 dark:bg-slate-700 dark:text-slate-100">
                {userInitials(user.username)}
              </div>
              <div className="min-w-0 flex-1 overflow-hidden text-left">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {user.username}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
              </div>
              <button
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                disabled={logoutSubmitting}
                onClick={handleLogout}
                title="Logout"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>
        </aside>

        <section className="relative flex h-full flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-[#0d1116]">
          <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-[#111418]">
            <div className="flex flex-1 items-center gap-4">
              <h1 className="hidden text-xl font-bold text-slate-900 dark:text-white md:block">
                {categoryTitle(activeCategory, categories)}
              </h1>
              <div className="group relative w-full max-w-md md:w-96">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
                </div>
                <input
                  className="block w-full rounded-lg border-0 bg-slate-100 py-2 pl-10 text-slate-900 placeholder:text-slate-400 transition-all focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:text-white"
                  placeholder={`Search in ${categoryTitle(activeCategory, categories)}...`}
                  type="text"
                />
              </div>
            </div>

            <div className="ml-4 flex items-center gap-2">
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
              </button>

              <button
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
                onClick={() => setBookmarkModalOpen(true)}
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span className="hidden sm:inline">Add Bookmark</span>
              </button>
            </div>
          </header>

          <main className="custom-scrollbar flex-1 overflow-y-auto p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{filteredBookmarks.length} bookmarks</p>
            </div>

            {globalError ? (
              <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {globalError}
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredBookmarks.map((bookmark, index) => (
                <article
                  key={bookmark.id}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-md dark:border-slate-800 dark:bg-[#161b22]"
                >
                  <div className="p-5">
                    <div className="mb-4 flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 flex-none items-center justify-center rounded-lg text-white ring-1 ring-slate-900/5 dark:ring-white/10 ${iconStyles[index % iconStyles.length]}`}
                      >
                        <span className="material-symbols-outlined">bookmark</span>
                      </div>
                      <div className="relative">
                        <button
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          onClick={() =>
                            setBookmarkMenuId((current) => (current === bookmark.id ? null : bookmark.id))
                          }
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                        </button>
                        {bookmarkMenuId === bookmark.id ? (
                          <div className="absolute right-0 top-8 z-10 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-[#1a2330]">
                            <button
                              aria-label="Delete bookmark"
                              className="flex h-9 w-9 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-slate-100 dark:text-red-300 dark:hover:bg-slate-800"
                              onClick={() => {
                                setBookmarkMenuId(null);
                                openDeleteBookmarkDialog(bookmark);
                              }}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-900 transition-colors group-hover:text-primary dark:text-white">
                      {bookmark.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                      {bookmark.description || "No description."}
                    </p>
                    <a
                      className="mt-2 inline-block w-full truncate text-xs text-slate-400 hover:text-primary hover:underline"
                      href={bookmark.url}
                    >
                      {bookmark.url.replace(/^https?:\/\//, "")}
                    </a>
                  </div>

                  <div className="flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50/50 px-5 py-3 dark:border-slate-800/50 dark:bg-slate-800/20">
                    <span className="text-xs text-slate-400">{formatRelativeTime(bookmark.createdAt)}</span>
                    <a
                      className="text-xs font-medium text-primary hover:text-primary/80"
                      href={bookmark.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Launch
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </main>
        </section>
      </div>

      <AddBookmarkDialog
        categories={categories}
        onOpenChange={setBookmarkModalOpen}
        onSaved={reloadData}
        open={bookmarkModalOpen}
      />

      <Dialog
        onOpenChange={(open) => {
          if (!open && !categoryDeleteSubmitting) {
            setCategoryToDelete(null);
          }
        }}
        open={Boolean(categoryToDelete)}
      >
        <DialogContent className="max-w-md p-0">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-[#151c26]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Category
              </DialogTitle>
              <DialogDescription>
                Bookmarks in this category will become uncategorized.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {`Delete "${categoryToDelete?.name ?? ""}"?`}
            </p>
          </div>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#151c26]">
            <button
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={categoryDeleteSubmitting}
              onClick={() => setCategoryToDelete(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={categoryDeleteSubmitting}
              onClick={confirmDeleteCategory}
              type="button"
            >
              {categoryDeleteSubmitting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !bookmarkDeleteSubmitting) {
            setBookmarkToDelete(null);
          }
        }}
        open={Boolean(bookmarkToDelete)}
      >
        <DialogContent className="max-w-md p-0">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-[#151c26]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Bookmark
              </DialogTitle>
              <DialogDescription>This operation cannot be undone.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-6 py-5">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {`Delete "${bookmarkToDelete?.title ?? ""}"?`}
            </p>
          </div>
          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#151c26]">
            <button
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={bookmarkDeleteSubmitting}
              onClick={() => setBookmarkToDelete(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={bookmarkDeleteSubmitting}
              onClick={confirmDeleteBookmark}
              type="button"
            >
              {bookmarkDeleteSubmitting ? "Deleting..." : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {categoryModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#151c26]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {categoryModalMode === "create" ? "Add Category" : "Rename Category"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {categoryModalMode === "create"
                ? "Create a category using a single name."
                : "Update the category name."}
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleCategorySubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="category-name-input">
                  Category Name
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                  id="category-name-input"
                  maxLength={60}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="e.g. Design Resources"
                  required
                  type="text"
                  value={categoryName}
                />
              </div>

              {categoryError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {categoryError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setCategoryModalOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={categorySubmitting}
                  type="submit"
                >
                  {categorySubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
