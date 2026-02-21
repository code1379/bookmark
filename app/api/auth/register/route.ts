import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser } from "@/lib/db/repositories/users";

const registerSchema = z
  .object({
    username: z.string().trim().min(2, "Username must be at least 2 characters").max(40),
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(8).max(128)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: parsed.error.flatten()
        },
        { status: 400 }
      );
    }

    const user = await createUser({
      username: parsed.data.username,
      email: parsed.data.email,
      password: parsed.data.password
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register user";
    const status = message === "Email already registered." ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
