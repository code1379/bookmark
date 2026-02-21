import { NextResponse } from "next/server";

import { UnauthorizedError, requireRequestUserId } from "@/lib/auth/user-context";
import { deleteBookmark } from "@/lib/db/repositories/bookmarks";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    const message = error instanceof Error ? error.message : "Failed to delete bookmark";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
