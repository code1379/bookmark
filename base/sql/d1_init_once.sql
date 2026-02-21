-- One-time initialization SQL for a fresh Cloudflare D1 database.
-- Generated from drizzle migrations:
--   - drizzle/0000_init.sql
--   - drizzle/0001_users_and_user_id.sql
--
-- Usage:
-- 1) Run this file once on an empty database.
-- 2) If your DB already has old tables/data, use migration SQL instead of this init file.

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  category_id INTEGER REFERENCES categories(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category_id ON bookmarks(category_id);

-- Optional legacy seed user from drizzle/0001_users_and_user_id.sql:
-- INSERT INTO users (username, email, password_hash)
-- SELECT 'legacy', 'legacy@example.local', 'c8bf3d9f7722839d6fd1da9e1469ff16:66901d2d47432f1da48cddc2734f5ec4f31e712fc03438c53aa0edbf4064e15c302922a09299381649172df6db7011b4ce53f58863182a6ea22705ef7c2b6140'
-- WHERE NOT EXISTS (SELECT 1 FROM users);

COMMIT;
