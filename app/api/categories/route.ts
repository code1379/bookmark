import { NextResponse } from "next/server";
import { z } from "zod";

import { UnauthorizedError, requireRequestUserId } from "@/lib/auth/user-context";
import { createCategory, listCategories } from "@/lib/db/repositories/categories";

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60)
});

export async function GET(request: Request) {
  try {
    const userId = await requireRequestUserId(request);
    const data = await listCategories(userId);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to load categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireRequestUserId(request);
    const payload = await request.json();
    const parsed = createCategorySchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const category = await createCategory(userId, parsed.data.name);
    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
