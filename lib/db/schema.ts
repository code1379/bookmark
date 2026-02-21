import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`)
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`)
});

export const bookmarks = sqliteTable("bookmarks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  categoryId: integer("category_id").references(() => categories.id),
  createdAt: integer("created_at").notNull().default(sql`(unixepoch())`)
});

export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  bookmarks: many(bookmarks)
}));

export const categoriesRelations = relations(categories, ({ many, one }) => ({
  bookmarks: many(bookmarks),
  user: one(users, {
    fields: [categories.userId],
    references: [users.id]
  })
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id]
  }),
  category: one(categories, {
    fields: [bookmarks.categoryId],
    references: [categories.id]
  })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
