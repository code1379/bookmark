# D1 Migration 操作指南

本项目运行在 `Vercel + Cloudflare D1 HTTP API + Drizzle`。

推荐迁移流程：

1. 修改 `lib/db/schema.ts`
2. 生成 SQL 迁移文件到 `drizzle/`
3. 用 `npm run db:exec -- <sql-file>` 应用到远端 D1

## 初始化

新数据库执行：

```bash
npm run db:exec -- drizzle/0000_init.sql
```

如果数据库是旧版本（没有 `users`、`user_id`）再执行：

```bash
npm run db:exec -- drizzle/0001_users_and_user_id.sql
```

## 新增表或字段

1. 修改 `lib/db/schema.ts`
2. 生成 SQL：

```bash
npm run db:generate
```

3. 检查生成的 SQL 文件（例如 `drizzle/0002_xxx.sql`）
4. 应用迁移：

```bash
npm run db:exec -- drizzle/0002_xxx.sql
```

## 环境变量

`db:exec` 会读取以下变量（优先 `process.env`，其次 `.env.local`）：

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`

## 常见问题

### `no such table: xxx`

说明目标数据库还没有执行对应 migration。

### `401/403`

通常是 token 权限不足，或环境变量写错。

### 迁移重复执行失败

多数迁移文件不是幂等的。请记录已执行版本，避免重复执行同一文件。
