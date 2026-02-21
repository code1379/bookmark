import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isD1Configured, queryD1 } from "@/lib/db/client";

import { fallbackStore, nextFallbackId } from "./fallback-store";

export type UserListItem = {
  id: number;
  username: string;
  email: string;
  createdAt: number;
};

export type CreateUserInput = {
  username: string;
  email: string;
  password: string;
};

type UserAuthRecord = UserListItem & {
  passwordHash: string;
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function parsePositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseUserAuthRow(row: Record<string, unknown>): UserAuthRecord | null {
  const id = parsePositiveInt(row.id);
  if (!id) {
    return null;
  }

  const username = String(row.username ?? "").trim();
  const email = String(row.email ?? "").trim().toLowerCase();
  const passwordHash = String(row.password_hash ?? row.passwordHash ?? "");
  const createdAt = Number(row.created_at ?? row.createdAt ?? nowSeconds());

  if (!username || !email || !passwordHash) {
    return null;
  }

  return {
    id,
    username,
    email,
    passwordHash,
    createdAt: Number.isFinite(createdAt) ? createdAt : nowSeconds()
  };
}

function parseUserRow(row: Record<string, unknown>): UserListItem | null {
  const id = parsePositiveInt(row.id);
  if (!id) {
    return null;
  }

  const username = String(row.username ?? "").trim();
  const email = String(row.email ?? "").trim().toLowerCase();
  const createdAt = Number(row.created_at ?? row.createdAt ?? nowSeconds());

  if (!username || !email) {
    return null;
  }

  return {
    id,
    username,
    email,
    createdAt: Number.isFinite(createdAt) ? createdAt : nowSeconds()
  };
}

async function findUserAuthByEmail(email: string): Promise<UserAuthRecord | null> {
  const normalized = normalizedEmail(email);

  if (!isD1Configured()) {
    const row = fallbackStore.users.find((item) => item.email === normalized);
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.passwordHash,
      createdAt: nowSeconds()
    };
  }

  const rows = await queryD1(
    "SELECT id, username, email, password_hash, created_at FROM users WHERE email = ? LIMIT 1",
    [normalized]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return parseUserAuthRow(row);
}

export async function findUserById(userId: number): Promise<UserListItem | null> {
  if (!isD1Configured()) {
    const row = fallbackStore.users.find((item) => item.id === userId);
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: nowSeconds()
    };
  }

  const rows = await queryD1(
    "SELECT id, username, email, created_at FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return parseUserRow(row);
}

export async function findUserByEmail(email: string): Promise<UserListItem | null> {
  const authUser = await findUserAuthByEmail(email);
  if (!authUser) {
    return null;
  }

  return {
    id: authUser.id,
    username: authUser.username,
    email: authUser.email,
    createdAt: authUser.createdAt
  };
}

export async function createUser(input: CreateUserInput): Promise<UserListItem> {
  const username = input.username.trim();
  const email = normalizedEmail(input.email);
  const passwordHash = hashPassword(input.password);

  if (!isD1Configured()) {
    const duplicate = fallbackStore.users.find((item) => item.email === email);
    if (duplicate) {
      throw new Error("Email already registered.");
    }

    const id = nextFallbackId(fallbackStore.users);
    fallbackStore.users.push({
      id,
      username,
      email,
      passwordHash
    });

    return {
      id,
      username,
      email,
      createdAt: nowSeconds()
    };
  }

  const duplicate = await queryD1("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (duplicate.length > 0) {
    throw new Error("Email already registered.");
  }

  await queryD1(
    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
    [username, email, passwordHash]
  );

  const created = await queryD1(
    "SELECT id, username, email, created_at FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  const row = created[0];
  if (!row) {
    throw new Error("Failed to create user.");
  }

  const user = parseUserRow(row);
  if (!user) {
    throw new Error("Failed to parse created user.");
  }

  return user;
}

export async function verifyUserCredentials(email: string, password: string) {
  const row = await findUserAuthByEmail(email);
  if (!row) {
    return null;
  }

  const isValid = verifyPassword(password, row.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    createdAt: row.createdAt
  } satisfies UserListItem;
}
