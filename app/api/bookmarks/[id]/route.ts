import { NextResponse } from "next/server";
import { z } from "zod";

import {
  UnauthorizedError,
  requireRequestUserId,
} from "@/lib/auth/user-context";
import {
  deleteBookmark,
  updateBookmark,
} from "@/lib/db/repositories/bookmarks";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const updateBookmarkSchema = z.object({
  url: z.string().url("Invalid URL").optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(300).optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).optional(),
});

function mapRepositoryError(message: string) {
  if (message === "Bookmark not found.") {
    return { status: 404, error: message };
  }

  if (
    message === "Invalid category id." ||
    message === "Selected category not found."
  ) {
    return { status: 400, error: message };
  }

  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const bookmarkId = parseId(params.id);
  if (!bookmarkId) {
    return NextResponse.json({ error: "Invalid bookmark id" }, { status: 400 });
  }

  try {
    const userId = await requireRequestUserId(request);
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const parsed = updateBookmarkSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    if (Object.values(parsed.data).every((val) => val === undefined)) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const bookmark = await updateBookmark(userId, bookmarkId, parsed.data);
    return NextResponse.json({ data: bookmark });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error) {
      const mapped = mapRepositoryError(error.message);
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error },
          { status: mapped.status },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to update bookmark" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const bookmarkId = parseId(params.id);
  if (!bookmarkId) {
    return NextResponse.json({ error: "Invalid bookmark id" }, { status: 400 });
  }

  try {
    const userId = await requireRequestUserId(request);
    await deleteBookmark(userId, bookmarkId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error) {
      const mapped = mapRepositoryError(error.message);
      if (mapped) {
        return NextResponse.json(
          { error: mapped.error },
          { status: mapped.status },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 },
    );
  }
}
