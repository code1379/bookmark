CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO users (username, email, password_hash)
SELECT 'legacy', 'legacy@example.local', 'c8bf3d9f7722839d6fd1da9e1469ff16:66901d2d47432f1da48cddc2734f5ec4f31e712fc03438c53aa0edbf4064e15c302922a09299381649172df6db7011b4ce53f58863182a6ea22705ef7c2b6140'
WHERE NOT EXISTS (SELECT 1 FROM users);

ALTER TABLE categories ADD COLUMN user_id INTEGER REFERENCES users(id);
UPDATE categories
SET user_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
WHERE user_id IS NULL;

ALTER TABLE bookmarks ADD COLUMN user_id INTEGER REFERENCES users(id);
UPDATE bookmarks
SET user_id = (SELECT id FROM users ORDER BY id ASC LIMIT 1)
WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
