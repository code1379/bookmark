import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import HomeClient from "@/components/home/home-client";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { listBookmarks } from "@/lib/db/repositories/bookmarks";
import { listCategories } from "@/lib/db/repositories/categories";
import { findUserById } from "@/lib/db/repositories/users";

export default async function HomePage() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;

  if (!session) {
    redirect("/login");
  }

  const user = await findUserById(session.userId);
  if (!user) {
    redirect("/login");
  }

  const userId = user.id;
  const [bookmarks, categories] = await Promise.all([
    listBookmarks(userId, 100),
    listCategories(userId)
  ]);

  return (
    <HomeClient
      initialBookmarks={bookmarks}
      initialCategories={categories}
      user={{
        username: user.username,
        email: user.email
      }}
    />
  );
}
