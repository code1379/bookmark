import { NextResponse } from "next/server";
import { z } from "zod";

import { UnauthorizedError, requireRequestUserId } from "@/lib/auth/user-context";
import { deleteCategory, renameCategory } from "@/lib/db/repositories/categories";

const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60)
});

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const categoryId = parseId(params.id);
  if (!categoryId) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    const userId = await requireRequestUserId(request);
    const payload = await request.json();
    const parsed = updateCategorySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const category = await renameCategory(userId, categoryId, parsed.data.name);
    return NextResponse.json({ data: category });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to update category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const categoryId = parseId(params.id);
  if (!categoryId) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    const userId = await requireRequestUserId(_request);
    await deleteCategory(userId, categoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to delete category";
    if (message === "Category contains bookmarks and cannot be deleted.") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
