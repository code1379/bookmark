import { isD1Configured, queryD1 } from "@/lib/db/client";

import { fallbackStore, nextFallbackId } from "./fallback-store";

export type BookmarkListItem = {
  id: number;
  title: string;
  url: string;
  description: string;
  categoryId: number | null;
  category: string;
  tags: string[];
  createdAt: number;
};

export type CreateBookmarkInput = {
  url: string;
  title?: string;
  description?: string;
  categoryId?: number | null;
  category?: string;
  tags?: string[];
};

function getHostTitle(url: string) {
  try {
    const host = new URL(url).hostname;
    return host.replace(/^www\./, "");
  } catch {
    return "Untitled";
  }
}

function safeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (tag): tag is string => typeof tag === "string" && tag.length > 0,
    );
  }

  if (typeof value === "string") {
    if (!value.trim() || value === "undefined" || value === "null") {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (tag): tag is string => typeof tag === "string" && tag.length > 0,
        );
      }
    } catch {
      return [];
    }
  }

  return [];
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveFallbackCategoryName(
  userId: number,
  categoryId: number | null,
) {
  if (categoryId === null) {
    return "Uncategorized";
  }

  const category = fallbackStore.categories.find(
    (item) => item.id === categoryId && item.userId === userId,
  );
  return category?.name ?? "Uncategorized";
}

export async function listBookmarks(
  userId: number,
  limit = 24,
): Promise<BookmarkListItem[]> {
  if (!isD1Configured()) {
    return fallbackStore.bookmarks
      .filter((item) => item.userId === userId)
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        description: item.description,
        categoryId: item.categoryId,
        category: resolveFallbackCategoryName(userId, item.categoryId),
        tags: item.tags,
        createdAt: item.createdAt,
      }));
  }

  const rows = await queryD1(
    `SELECT
      b.id,
      b.title,
      b.url,
      b.description,
      b.category_id AS categoryId,
      c.name AS category,
      b.tags,
      b.created_at AS createdAt
    FROM bookmarks b
    LEFT JOIN categories c
      ON b.category_id = c.id
      AND c.user_id = b.user_id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
    LIMIT ?`,
    [userId, limit],
  );

  return rows.map((row) => ({
    id: toNumber(row.id),
    title: String(row.title ?? ""),
    url: String(row.url ?? ""),
    description: String(row.description ?? ""),
    categoryId: row.categoryId === null ? null : toNumber(row.categoryId, 0),
    category: String(row.category ?? "Uncategorized"),
    tags: safeTags(row.tags),
    createdAt: toNumber(row.createdAt, Math.floor(Date.now() / 1000)),
  }));
}

async function ensureCategoryIdByName(userId: number, name?: string) {
  if (!name || !name.trim()) {
    return null;
  }

  const trimmedName = name.trim();

  const existingRows = await queryD1(
    "SELECT id FROM categories WHERE user_id = ? AND name = ? LIMIT 1",
    [userId, trimmedName],
  );
  const existingId = existingRows[0] ? toNumber(existingRows[0].id, 0) : 0;
  if (existingId > 0) {
    return existingId;
  }

  await queryD1("INSERT INTO categories (user_id, name) VALUES (?, ?)", [
    userId,
    trimmedName,
  ]);
  const insertedRows = await queryD1(
    "SELECT id FROM categories WHERE user_id = ? AND name = ? ORDER BY id DESC LIMIT 1",
    [userId, trimmedName],
  );

  const insertedId = insertedRows[0] ? toNumber(insertedRows[0].id, 0) : 0;
  return insertedId > 0 ? insertedId : null;
}

function ensureFallbackCategoryId(userId: number, name?: string) {
  if (!name || !name.trim()) {
    return null;
  }

  const trimmedName = name.trim();
  const existing = fallbackStore.categories.find(
    (item) => item.userId === userId && item.name === trimmedName,
  );
  if (existing) {
    return existing.id;
  }

  const id = nextFallbackId(fallbackStore.categories);
  fallbackStore.categories.push({ id, userId, name: trimmedName });
  return id;
}

async function resolveCategoryIdForCreate(
  userId: number,
  input: CreateBookmarkInput,
) {
  if (input.categoryId === null) {
    return null;
  }

  if (input.categoryId !== undefined) {
    if (!Number.isInteger(input.categoryId) || input.categoryId <= 0) {
      throw new Error("Invalid category id.");
    }

    if (!isD1Configured()) {
      const exists = fallbackStore.categories.some(
        (item) => item.id === input.categoryId && item.userId === userId,
      );
      if (!exists) {
        throw new Error("Selected category not found.");
      }
      return input.categoryId;
    }

    const rows = await queryD1(
      "SELECT id FROM categories WHERE user_id = ? AND id = ? LIMIT 1",
      [userId, input.categoryId],
    );
    if (rows.length === 0) {
      throw new Error("Selected category not found.");
    }
    return input.categoryId;
  }

  if (!isD1Configured()) {
    return ensureFallbackCategoryId(userId, input.category);
  }

  return ensureCategoryIdByName(userId, input.category);
}

export async function createBookmark(
  userId: number,
  input: CreateBookmarkInput,
): Promise<BookmarkListItem> {
  const title = (input.title && input.title.trim()) || getHostTitle(input.url);
  const description = input.description?.trim() || "";
  const tags = input.tags?.filter(Boolean) ?? [];
  const categoryId = await resolveCategoryIdForCreate(userId, input);

  if (!isD1Configured()) {
    const id = nextFallbackId(fallbackStore.bookmarks);
    const createdAt = Math.floor(Date.now() / 1000);

    const created = {
      id,
      userId,
      title,
      url: input.url,
      description,
      tags,
      categoryId,
      createdAt,
    };

    fallbackStore.bookmarks.unshift(created);

    return {
      ...created,
      category: resolveFallbackCategoryName(userId, categoryId),
    };
  }

  const rows = await queryD1(
    `INSERT INTO bookmarks (user_id, url, title, description, tags, category_id)
    VALUES (?, ?, ?, ?, ?, ?)
    RETURNING id, title, url, description, category_id AS categoryId, created_at AS createdAt`,
    [userId, input.url, title, description, JSON.stringify(tags), categoryId],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create bookmark.");
  }

  let categoryName = "Uncategorized";
  if (categoryId !== null) {
    const categoryRows = await queryD1(
      "SELECT name FROM categories WHERE user_id = ? AND id = ? LIMIT 1",
      [userId, categoryId],
    );
    categoryName = String(categoryRows[0]?.name ?? "Uncategorized");
  }

  return {
    id: toNumber(row.id),
    title: String(row.title ?? title),
    url: String(row.url ?? input.url),
    description: String(row.description ?? description),
    categoryId,
    category: categoryName,
    tags,
    createdAt: toNumber(row.createdAt, Math.floor(Date.now() / 1000)),
  };
}

export async function deleteBookmark(userId: number, id: number) {
  if (!isD1Configured()) {
    const exists = fallbackStore.bookmarks.some(
      (item) => item.id === id && item.userId === userId,
    );
    if (!exists) {
      throw new Error("Bookmark not found.");
    }

    fallbackStore.bookmarks = fallbackStore.bookmarks.filter(
      (item) => !(item.id === id && item.userId === userId),
    );
    return;
  }

  const exists = await queryD1(
    "SELECT id FROM bookmarks WHERE user_id = ? AND id = ? LIMIT 1",
    [userId, id],
  );
  if (exists.length === 0) {
    throw new Error("Bookmark not found.");
  }

  await queryD1("DELETE FROM bookmarks WHERE user_id = ? AND id = ?", [
    userId,
    id,
  ]);
}

export type UpdateBookmarkInput = {
  url?: string;
  title?: string;
  description?: string;
  categoryId?: number | null;
  tags?: string[];
};

async function resolveCategoryIdForUpdate(
  userId: number,
  inputCategoryId: number | null | undefined,
  currentCategoryId: number | null,
) {
  if (inputCategoryId === undefined) {
    return currentCategoryId;
  }

  if (inputCategoryId === null) {
    return null;
  }

  if (!Number.isInteger(inputCategoryId) || inputCategoryId <= 0) {
    throw new Error("Invalid category id.");
  }

  if (!isD1Configured()) {
    const exists = fallbackStore.categories.some(
      (item) => item.id === inputCategoryId && item.userId === userId,
    );
    if (!exists) {
      throw new Error("Selected category not found.");
    }
    return inputCategoryId;
  }

  const rows = await queryD1(
    "SELECT id FROM categories WHERE user_id = ? AND id = ? LIMIT 1",
    [userId, inputCategoryId],
  );
  if (rows.length === 0) {
    throw new Error("Selected category not found.");
  }

  return inputCategoryId;
}

export async function updateBookmark(
  userId: number,
  id: number,
  input: UpdateBookmarkInput,
): Promise<BookmarkListItem> {
  if (!isD1Configured()) {
    const index = fallbackStore.bookmarks.findIndex(
      (item) => item.id === id && item.userId === userId,
    );
    if (index === -1) {
      throw new Error("Bookmark not found.");
    }

    const existing = fallbackStore.bookmarks[index];
    const newCategoryId = await resolveCategoryIdForUpdate(
      userId,
      input.categoryId,
      existing.categoryId,
    );
    const updated = {
      ...existing,
      url: input.url ?? existing.url,
      title: input.title ?? existing.title,
      description: input.description ?? existing.description,
      categoryId: newCategoryId,
      tags: input.tags ?? existing.tags,
    };

    fallbackStore.bookmarks[index] = updated;

    return {
      id: updated.id,
      title: updated.title,
      url: updated.url,
      description: updated.description,
      categoryId: updated.categoryId,
      category: resolveFallbackCategoryName(userId, updated.categoryId),
      tags: updated.tags,
      createdAt: updated.createdAt,
    };
  }

  const existingRows = await queryD1(
    "SELECT id, title, url, description, category_id AS categoryId, tags, created_at AS createdAt FROM bookmarks WHERE user_id = ? AND id = ? LIMIT 1",
    [userId, id],
  );
  if (existingRows.length === 0) {
    throw new Error("Bookmark not found.");
  }

  const existing = existingRows[0];
  const newUrl = input.url ?? String(existing.url);
  const newTitle = input.title ?? String(existing.title);
  const newDescription =
    input.description ?? String(existing.description ?? "");
  const existingCategoryId =
    existing.categoryId === null ? null : toNumber(existing.categoryId);
  const newCategoryId = await resolveCategoryIdForUpdate(
    userId,
    input.categoryId,
    existingCategoryId,
  );
  const newTags = input.tags ?? safeTags(existing.tags);

  await queryD1(
    "UPDATE bookmarks SET url = ?, title = ?, description = ?, tags = ?, category_id = ? WHERE user_id = ? AND id = ?",
    [
      newUrl,
      newTitle,
      newDescription,
      JSON.stringify(newTags),
      newCategoryId,
      userId,
      id,
    ],
  );

  let categoryName = "Uncategorized";
  if (newCategoryId !== null) {
    const categoryRows = await queryD1(
      "SELECT name FROM categories WHERE user_id = ? AND id = ? LIMIT 1",
      [userId, newCategoryId],
    );
    categoryName = String(categoryRows[0]?.name ?? "Uncategorized");
  }

  return {
    id,
    title: newTitle,
    url: newUrl,
    description: newDescription,
    categoryId: newCategoryId,
    category: categoryName,
    tags: newTags,
    createdAt: toNumber(existing.createdAt, Math.floor(Date.now() / 1000)),
  };
}
