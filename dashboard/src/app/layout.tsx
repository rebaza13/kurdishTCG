import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { missingSupabaseEnv } from "@/lib/supabase";
import "./globals.css";

export const metadata: Metadata = {
  title: "KurdishTCG Admin",
  description: "Orders, products and franchises for the KurdishTCG storefront.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Without these the app can't talk to Supabase and every page would crash
  // with a generic "can't load page" — say exactly what's wrong instead.
  const missing = missingSupabaseEnv();
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {missing.length > 0 ? (
          <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4 py-10">
            <h1 className="text-xl font-semibold">The dashboard isn&apos;t configured</h1>
            <p className="text-sm text-muted">
              These environment variables were missing when this version was built:
            </p>
            <ul className="flex flex-col gap-1.5">
              {missing.map((name) => (
                <li key={name} className="rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm">
                  {name}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              On Vercel: Project → Settings → Environment Variables, add them (same values as the
              storefront) for Production, then Deployments → ⋯ → Redeploy. Locally: copy
              .env.example to .env.local.
            </p>
          </main>
        ) : (
          <AuthProvider>{children}</AuthProvider>
        )}
      </body>
    </html>
  );
}
