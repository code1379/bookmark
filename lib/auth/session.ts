import { createHmac, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE_NAME = "bookmark_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function getAuthSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.CLOUDFLARE_D1_API_TOKEN ||
    "bookmark-dev-secret-change-me"
  );
}

function sign(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

function parsePositiveInt(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function createSessionToken(userId: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const userId = parsePositiveInt(parts[0]);
  const expiresAt = parsePositiveInt(parts[1]);
  const incomingSignature = parts[2];

  if (!userId || !expiresAt || !incomingSignature) {
    return null;
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const payload = `${userId}.${expiresAt}`;
  const expectedSignature = sign(payload);
  const incomingBuffer = Buffer.from(incomingSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (incomingBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(incomingBuffer, expectedBuffer)) {
    return null;
  }

  return { userId, expiresAt };
}

function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const segments = cookieHeader.split(";");
  for (const segment of segments) {
    const [key, ...valueParts] = segment.trim().split("=");
    if (key === name) {
      return decodeURIComponent(valueParts.join("="));
    }
  }

  return null;
}

export function getSessionUserIdFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const token = readCookieValue(cookieHeader, AUTH_COOKIE_NAME);
  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);
  return session?.userId ?? null;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}
