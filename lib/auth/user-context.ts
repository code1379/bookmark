import { getSessionUserIdFromRequest } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/repositories/users";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireRequestUserId(request: Request) {
  const userId = getSessionUserIdFromRequest(request);
  if (!userId) {
    throw new UnauthorizedError();
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new UnauthorizedError();
  }

  return user.id;
}
