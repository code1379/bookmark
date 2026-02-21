import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function parseDotenv(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadEnv() {
  const fromFile = existsSync(".env.local")
    ? parseDotenv(readFileSync(".env.local", "utf8"))
    : {};

  return {
    CLOUDFLARE_ACCOUNT_ID:
      process.env.CLOUDFLARE_ACCOUNT_ID || fromFile.CLOUDFLARE_ACCOUNT_ID || "",
    CLOUDFLARE_D1_DATABASE_ID:
      process.env.CLOUDFLARE_D1_DATABASE_ID ||
      fromFile.CLOUDFLARE_D1_DATABASE_ID ||
      "",
    CLOUDFLARE_D1_API_TOKEN:
      process.env.CLOUDFLARE_D1_API_TOKEN || fromFile.CLOUDFLARE_D1_API_TOKEN || ""
  };
}

function splitStatements(sqlContent) {
  const statements = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let prev = "";

  for (const ch of sqlContent) {
    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
      current += ch;
      prev = ch;
      continue;
    }

    if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
      current += ch;
      prev = ch;
      continue;
    }

    if (ch === ";" && !inSingle && !inDouble) {
      const trimmed = current.trim();
      if (trimmed) {
        statements.push(trimmed);
      }
      current = "";
      prev = ch;
      continue;
    }

    current += ch;
    prev = ch;
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

async function execStatement(endpoint, token, sql, index, total) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      sql,
      params: []
    })
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const details = (json?.errors || [])
      .map((item) => `[${item.code}] ${item.message}`)
      .join("; ");
    throw new Error(
      `Statement ${index}/${total} failed: ${details || "unknown error"}\nSQL: ${sql}`
    );
  }

  console.log(`OK ${index}/${total}`);
}

async function main() {
  const fileArg = process.argv[2];

  if (!fileArg) {
    console.error("Usage: npm run db:exec -- <sql-file-path>");
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!existsSync(filePath)) {
    console.error(`SQL file not found: ${filePath}`);
    process.exit(1);
  }

  const env = loadEnv();
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${env.CLOUDFLARE_D1_DATABASE_ID}/query`;
  const sqlContent = readFileSync(filePath, "utf8");
  const statements = splitStatements(sqlContent);

  if (statements.length === 0) {
    console.error(`No SQL statement found in: ${filePath}`);
    process.exit(1);
  }

  console.log(`Applying ${statements.length} statements from ${fileArg}`);
  for (let i = 0; i < statements.length; i += 1) {
    await execStatement(
      endpoint,
      env.CLOUDFLARE_D1_API_TOKEN,
      statements[i],
      i + 1,
      statements.length
    );
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
