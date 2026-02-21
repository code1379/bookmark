"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type LoginForm = {
  email: string;
  password: string;
};

const initialForm: LoginForm = {
  email: "",
  password: ""
};

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState<LoginForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = (await response.json()) as {
        error?: string;
        details?: { fieldErrors?: Record<string, string[]> };
      };

      if (!response.ok) {
        const fieldErrors = payload.details?.fieldErrors;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors).flat().find(Boolean)
          : null;
        throw new Error(firstFieldError || payload.error || "Login failed");
      }

      router.push("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-12 lg:flex">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-full opacity-10">
          <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-primary blur-[128px]" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-700 blur-[96px]" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined">bookmarks</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Bookmarker</h1>
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="mb-6 text-4xl font-bold leading-tight text-white">Organize your digital world in one place.</h2>
          <p className="mb-8 text-lg text-slate-400">
            Save, categorize, and access your favorite content from anywhere. Join thousands of productive users today.
          </p>
        </div>

        <p className="relative z-10 text-sm text-slate-500">Copyright 2026 Bookmarker Inc. All rights reserved.</p>
      </section>

      <section className="flex w-full items-center justify-center bg-white p-6 dark:bg-[#101822] lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="mb-6 flex justify-center lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white">
                <span className="material-symbols-outlined text-[28px]">bookmarks</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Please enter your details to sign in.</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                  Email address
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </div>
                  <input
                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                    id="email"
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={form.email}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                  Password
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <input
                    className="block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                    id="password"
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="••••••••"
                    required
                    type="password"
                    value={form.password}
                  />
                </div>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}

            <button
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link className="font-medium text-primary hover:text-blue-500" href="/register">
              Sign up for free
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
