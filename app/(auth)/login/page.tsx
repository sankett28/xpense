"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import FaultyTerminal from "@/components/ui/FaultyTerminal";
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
    <main className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden px-6 py-12">
      {/* Animated terminal background. */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-canvas">
        <FaultyTerminal
          scale={1.6}
          gridMul={[2, 1]}
          digitSize={1.2}
          timeScale={0.6}
          scanlineIntensity={0.6}
          glitchAmount={1}
          flickerAmount={0.8}
          noiseAmp={1}
          curvature={0.1}
          tint="#5bd6c0"
          mouseReact
          mouseStrength={0.4}
          pageLoadAnimation
          brightness={0.55}
          className="!pointer-events-auto h-full w-full opacity-70"
        />
        {/* Darkening veil so foreground text stays legible over the animation. */}
        <div className="absolute inset-0 bg-canvas/40" />
      </div>

      <div className="relative z-10 w-full max-w-[var(--container-app)] mx-auto">
        {/* Frosted-glass card: ~12% translucent fill + backdrop blur. */}
        <div className="rounded-3xl border border-ink/15 bg-ink/[0.12] p-8 shadow-2xl backdrop-blur-xl">
          <header className="mb-8">
            <span className="block font-display text-2xl font-medium text-ink/70">
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
                className="w-full rounded-xl border border-ink/15 bg-canvas/40 px-4 py-3 text-ink outline-none transition focus:border-pace-good focus:ring-2 focus:ring-pace-good/40"
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
                className="w-full rounded-xl border border-ink/15 bg-canvas/40 px-4 py-3 text-ink outline-none transition focus:border-pace-good focus:ring-2 focus:ring-pace-good/40"
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
              className="w-full rounded-xl bg-pace-good px-4 py-3 font-medium text-canvas transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink/70">
          Access is provided by your administrator.
        </p>
      </div>
    </main>
  );
}
