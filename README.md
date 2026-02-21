# Bookmarker (Next.js + Vercel + Cloudflare D1 + Drizzle)

This project is initialized with **Next.js App Router**.

- `/login`: Login page
- `/register`: Register page
- `/`: Home page (bookmark list + add bookmark modal + category management)

`/` requires login. Unauthenticated access is redirected to `/login`.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Drizzle ORM
- Cloudflare D1 (via HTTP API from Vercel server runtime)

## 1. Install

```bash
npm install
```

## 2. Environment Variables

Create `.env.local` from `.env.example` and fill values:

```bash
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_DATABASE_ID=
CLOUDFLARE_D1_API_TOKEN=
```

`CLOUDFLARE_D1_API_TOKEN` needs D1 edit/query permissions.

## 3. Initialize D1 Schema

Run SQL migration on your D1 database:

```bash
npm run db:exec -- drizzle/0000_init.sql
```

More migration docs: `docs/d1-migrations.md`

If your database was created before the `users/user_id` changes, run:

```bash
npm run db:exec -- drizzle/0001_users_and_user_id.sql
```

After `0001` migration, a legacy seed user exists:

- email: `legacy@example.local`
- password: `Legacy@123456`

## 4. Development

```bash
npm run dev
```

Visit:

- `http://localhost:3000/login`
- `http://localhost:3000/`

## 5. API

- `GET /api/bookmarks` - list bookmarks
- `POST /api/bookmarks` - create bookmark
- `GET /api/categories` - list categories
- `POST /api/categories` - create category
- `PATCH /api/categories/:id` - rename category
- `DELETE /api/categories/:id` - delete category (bookmarks become uncategorized)
- `POST /api/auth/register` - register user
- `POST /api/auth/login` - login and set session cookie
- `POST /api/auth/logout` - clear session cookie

`/api/bookmarks` and `/api/categories` now require authenticated session cookie.

Bookmark payload example:

```json
{
  "url": "https://example.com",
  "title": "Example",
  "description": "Example site",
  "category": "Design Resources",
  "tags": ["design", "inspiration"]
}
```

Category payload example:

```json
{
  "name": "Design Resources"
}
```

Register payload example:

```json
{
  "username": "taisha",
  "email": "taisha@example.com",
  "password": "StrongPass123",
  "confirmPassword": "StrongPass123"
}
```

## 6. Vercel Deployment

1. Import this repository into Vercel.
2. Add environment variables in Vercel Project Settings:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_D1_DATABASE_ID`
   - `CLOUDFLARE_D1_API_TOKEN`
3. Deploy.

This project uses standard Vercel Next.js directory conventions (`app/`, `app/api/`).
