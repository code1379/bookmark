import { drizzle } from "drizzle-orm/sqlite-proxy";

type D1ApiError = {
  code: number;
  message: string;
};

type D1Result = {
  success: boolean;
  results?: Record<string, unknown>[];
};

type D1ApiResponse = {
  success: boolean;
  errors?: D1ApiError[];
  result?: D1Result[];
};

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_D1_API_TOKEN;

const isConfigured = Boolean(accountId && databaseId && apiToken);

const endpoint = isConfigured
  ? `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`
  : "";

async function executeOnD1(sql: string, params: unknown[] = []) {
  if (!isConfigured) {
    throw new Error("Cloudflare D1 is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID and CLOUDFLARE_D1_API_TOKEN.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`
    },
    body: JSON.stringify({ sql, params }),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`D1 request failed (${response.status}): ${message}`);
  }

  const json = (await response.json()) as D1ApiResponse;
  if (!json.success || (json.errors && json.errors.length > 0)) {
    const details = json.errors?.map((err) => `${err.code}: ${err.message}`).join("; ") ?? "Unknown error";
    throw new Error(`D1 query failed: ${details}`);
  }

  const firstResult = json.result?.[0];
  if (!firstResult?.success) {
    throw new Error("D1 query failed with empty result payload.");
  }

  return firstResult.results ?? [];
}

export async function queryD1(sql: string, params: unknown[] = []) {
  return executeOnD1(sql, params);
}

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(async (sql, params) => {
      const rows = await executeOnD1(sql, (params ?? []) as unknown[]);
      return { rows };
    });
  }

  return dbInstance;
}

export function isD1Configured() {
  return isConfigured;
}
