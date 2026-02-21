"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type RegisterForm = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialForm: RegisterForm = {
  username: "",
  email: "",
  password: "",
  confirmPassword: ""
};

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
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
        throw new Error(firstFieldError || payload.error || "Failed to register");
      }

      setSuccess("Registration successful. Redirecting to login...");
      setForm(initialForm);

      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to register");
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
          <h2 className="mb-6 text-4xl font-bold leading-tight text-white">Create your account</h2>
          <p className="mb-8 text-lg text-slate-400">
            Start organizing bookmarks by category and keep your links synced with your profile.
          </p>
        </div>

        <p className="relative z-10 text-sm text-slate-500">Copyright 2026 Bookmarker Inc. All rights reserved.</p>
      </section>

      <section className="flex w-full items-center justify-center bg-white p-6 dark:bg-[#101822] lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Sign up</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Fill in your details to create a new account.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="username">
                  Username
                </label>
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 px-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                  id="username"
                  onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  placeholder="your-name"
                  required
                  type="text"
                  value={form.username}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
                  Email
                </label>
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 px-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                  id="email"
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={form.email}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                  Password
                </label>
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 px-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                  id="password"
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  placeholder="At least 8 characters"
                  required
                  type="password"
                  value={form.password}
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  htmlFor="confirmPassword"
                >
                  Confirm Password
                </label>
                <input
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 py-3 px-3 text-slate-900 placeholder-slate-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-[#1c2430] dark:text-white"
                  id="confirmPassword"
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  placeholder="Repeat password"
                  required
                  type="password"
                  value={form.confirmPassword}
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                {success}
              </p>
            ) : null}

            <button
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{" "}
            <Link className="font-medium text-primary hover:text-blue-500" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
