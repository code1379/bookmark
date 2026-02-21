import { isD1Configured, queryD1 } from "@/lib/db/client";

import { fallbackStore, nextFallbackId } from "./fallback-store";

export type CategoryListItem = {
  id: number;
  name: string;
  bookmarkCount: number;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeName(value: unknown) {
  const text = String(value ?? "").trim();
  return text || "(untitled)";
}

function parseCategoryRow(row: Record<string, unknown>): CategoryListItem | null {
  const id = toNumber(row.id, 0);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return {
    id,
    name: normalizeName(row.name),
    bookmarkCount: toNumber(row.bookmark_count ?? row.bookmarkCount, 0)
  };
}

export async function listCategories(userId: number): Promise<CategoryListItem[]> {
  if (!isD1Configured()) {
    return fallbackStore.categories
      .filter((category) => category.userId === userId)
      .map((category) => ({
        id: category.id,
        name: category.name,
        bookmarkCount: fallbackStore.bookmarks.filter(
          (item) => item.userId === userId && item.categoryId === category.id
        ).length
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const rows = await queryD1(
    `SELECT
      c.id AS id,
      c.name AS name,
      COUNT(b.id) AS bookmark_count
    FROM categories c
    LEFT JOIN bookmarks b
      ON c.id = b.category_id
      AND b.user_id = ?
    WHERE c.user_id = ?
    GROUP BY c.id, c.name
    ORDER BY c.name ASC`,
    [userId, userId]
  );

  return rows
    .map((row) => parseCategoryRow(row))
    .filter((item): item is CategoryListItem => item !== null);
}

export async function createCategory(userId: number, name: string): Promise<CategoryListItem> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Category name is required.");
  }

  if (!isD1Configured()) {
    const existing = fallbackStore.categories.find(
      (item) =>
        item.userId === userId && item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      throw new Error("Category name already exists.");
    }

    const id = nextFallbackId(fallbackStore.categories);
    fallbackStore.categories.push({ id, userId, name: trimmedName });

    return {
      id,
      name: trimmedName,
      bookmarkCount: 0
    };
  }

  const duplicate = await queryD1(
    "SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?) LIMIT 1",
    [userId, trimmedName]
  );
  if (duplicate.length > 0) {
    throw new Error("Category name already exists.");
  }

  await queryD1("INSERT INTO categories (user_id, name) VALUES (?, ?)", [userId, trimmedName]);

  const createdRows = await queryD1(
    "SELECT id, name FROM categories WHERE user_id = ? AND name = ? ORDER BY id DESC LIMIT 1",
    [userId, trimmedName]
  );
  const parsed = createdRows[0] ? parseCategoryRow(createdRows[0]) : null;
  if (!parsed) {
    throw new Error("Failed to create category.");
  }

  return {
    id: parsed.id,
    name: parsed.name,
    bookmarkCount: 0
  };
}

export async function renameCategory(
  userId: number,
  id: number,
  name: string
): Promise<CategoryListItem> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Category name is required.");
  }

  if (!isD1Configured()) {
    const target = fallbackStore.categories.find(
      (item) => item.id === id && item.userId === userId
    );
    if (!target) {
      throw new Error("Category not found.");
    }

    const duplicate = fallbackStore.categories.find(
      (item) =>
        item.userId === userId &&
        item.id !== id &&
        item.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      throw new Error("Category name already exists.");
    }

    target.name = trimmedName;

    return {
      id: target.id,
      name: target.name,
      bookmarkCount: fallbackStore.bookmarks.filter(
        (item) => item.userId === userId && item.categoryId === target.id
      ).length
    };
  }

  const exists = await queryD1(
    "SELECT id FROM categories WHERE user_id = ? AND id = ? LIMIT 1",
    [userId, id]
  );
  if (exists.length === 0) {
    throw new Error("Category not found.");
  }

  const duplicate = await queryD1(
    "SELECT id FROM categories WHERE user_id = ? AND lower(name) = lower(?) AND id <> ? LIMIT 1",
    [userId, trimmedName, id]
  );
  if (duplicate.length > 0) {
    throw new Error("Category name already exists.");
  }

  await queryD1("UPDATE categories SET name = ? WHERE user_id = ? AND id = ?", [
    trimmedName,
    userId,
    id
  ]);

  const rows = await queryD1(
    `SELECT
      c.id AS id,
      c.name AS name,
      COUNT(b.id) AS bookmark_count
    FROM categories c
    LEFT JOIN bookmarks b
      ON c.id = b.category_id
      AND b.user_id = ?
    WHERE c.user_id = ?
      AND c.id = ?
    GROUP BY c.id, c.name
    LIMIT 1`,
    [userId, userId, id]
  );

  const parsed = rows[0] ? parseCategoryRow(rows[0]) : null;
  if (!parsed) {
    throw new Error("Category not found.");
  }

  return parsed;
}

export async function deleteCategory(userId: number, id: number) {
  if (!isD1Configured()) {
    const exists = fallbackStore.categories.some(
      (item) => item.id === id && item.userId === userId
    );
    if (!exists) {
      throw new Error("Category not found.");
    }

    const hasBookmarks = fallbackStore.bookmarks.some(
      (item) => item.userId === userId && item.categoryId === id
    );
    if (hasBookmarks) {
      throw new Error("Category contains bookmarks and cannot be deleted.");
    }

    fallbackStore.categories = fallbackStore.categories.filter(
      (item) => !(item.id === id && item.userId === userId)
    );

    return;
  }

  const exists = await queryD1(
    "SELECT id FROM categories WHERE user_id = ? AND id = ? LIMIT 1",
    [userId, id]
  );
  if (exists.length === 0) {
    throw new Error("Category not found.");
  }

  const bookmarkCountRows = await queryD1(
    "SELECT COUNT(1) AS total FROM bookmarks WHERE user_id = ? AND category_id = ?",
    [userId, id]
  );
  const bookmarkCount = Number(bookmarkCountRows[0]?.total ?? 0);
  if (bookmarkCount > 0) {
    throw new Error("Category contains bookmarks and cannot be deleted.");
  }

  await queryD1("DELETE FROM categories WHERE user_id = ? AND id = ?", [userId, id]);
}
