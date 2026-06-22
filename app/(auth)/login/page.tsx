"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export default function LoginPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signIn, initialState);

  // Navigate client-side once the action confirms sign-in succeeded. Doing this
  // after the action resolves (rather than redirect() inside it) guarantees the
  // auth cookie is committed before "/" is fetched, avoiding the redirect race.
  useEffect(() => {
    if (state.ok) {
      router.replace("/");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-[var(--container-app)] mx-auto">
        <div className="rounded-3xl bg-surface p-8 shadow-sm">
          <header className="mb-8">
            <span className="block font-display text-2xl font-medium text-ink-soft">
              Sign in to
            </span>
            <h1 className="font-display text-5xl font-bold tracking-tight text-ink">
              {APP_NAME}
            </h1>
          </header>

          <form action={formAction} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="label-caps block">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-ink/10 bg-bg px-4 py-3 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="label-caps block">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-ink/10 bg-bg px-4 py-3 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
                placeholder="••••••••"
              />
            </div>

            {state.error ? (
              <p
                role="alert"
                className="rounded-xl bg-alert/15 px-4 py-3 text-sm text-alert"
              >
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          Access is provided by your administrator.
        </p>
      </div>
    </main>
  );
}
