import { NextResponse } from "next/server";
import { z } from "zod";

import { UnauthorizedError, requireRequestUserId } from "@/lib/auth/user-context";
import { createBookmark, listBookmarks } from "@/lib/db/repositories/bookmarks";

const createBookmarkSchema = z.object({
  url: z.string().url("Invalid URL"),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  category: z.string().trim().max(60).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional()
});

export async function GET(request: Request) {
  try {
    const userId = await requireRequestUserId(request);
    const data = await listBookmarks(userId, 100);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to load bookmarks";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireRequestUserId(request);
    const payload = await request.json();
    const parsed = createBookmarkSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const bookmark = await createBookmark(userId, parsed.data);
    return NextResponse.json({ data: bookmark }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to create bookmark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
