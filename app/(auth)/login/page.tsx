"use client";

import { useActionState } from "react";
import { APP_NAME } from "@/lib/config";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-[var(--container-app)] mx-auto">
        <div className="rounded-3xl bg-surface p-8 shadow-sm">
          <header className="mb-8 text-center">
            <h1 className="font-display text-4xl font-bold tracking-tight text-ink">
              {APP_NAME}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Sign in to your account
            </p>
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
