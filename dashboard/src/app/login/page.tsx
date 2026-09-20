"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, Card, Field, Input, Notice } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const { state, signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "admin") router.replace("/");
  }, [state.status, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const message = await signIn(
      String(form.get("email") ?? "").trim(),
      String(form.get("password") ?? "")
    );
    setSubmitting(false);
    if (message) setError(message);
    else router.replace("/");
  }

  const notice = error ?? (state.status === "signed-out" ? state.notice : undefined);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            KurdishTCG
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Orders, products and franchises.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Email" required>
            <Input
              name="email"
              type="email"
              autoComplete="username"
              required
              autoFocus
            />
          </Field>
          <Field label="Password" required>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {notice && <Notice>{notice}</Notice>}
          <Button type="submit" variant="primary" loading={submitting}>
            Sign in
          </Button>
        </form>
      </Card>
    </main>
  );
}
