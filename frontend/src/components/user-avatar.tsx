"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useSupabaseUser } from "@/lib/use-supabase-user";

/**
 * The signed-in user's Google profile picture (or their initial when the
 * account has no picture), so it is obvious at a glance that you're logged
 * in. Renders `fallback` while loading and when signed out.
 */
export function UserAvatar({ size, fallback }: { size: number; fallback: ReactNode }) {
  const user = useSupabaseUser();
  const [broken, setBroken] = useState(false);
  if (!user) return <>{fallback}</>;

  const meta = user.user_metadata ?? {};
  const src: string | undefined = meta.avatar_url || meta.picture;
  const name: string = meta.full_name || meta.name || user.email || "";

  if (src && !broken) {
    return (
      // Plain <img>: Google avatar hosts vary, and this is a tiny fixed-size icon.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="rounded-full object-cover ring-2 ring-[var(--color-accent)]"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold uppercase"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

/** Header account button: avatar when signed in, person icon otherwise. */
export function AccountButton() {
  const t = useTranslations("nav");
  return (
    <Link href="/account" className="kt-icon-btn" aria-label={t("account")}>
      <UserAvatar size={28} fallback={<User className="size-[18px]" strokeWidth={1.8} />} />
    </Link>
  );
}
