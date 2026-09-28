"use client";

import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeLabel, type Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("locale");

  return (
    <Select.Root
      value={locale}
      onValueChange={(next) => router.replace(pathname, { locale: next as Locale })}
    >
      <Select.Trigger aria-label={t("label")} className="kt-lang-btn">
        <Globe className="size-[17px]" strokeWidth={1.8} />
        <Select.Value />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className="z-50 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
        >
          <Select.Viewport>
            {locales.map((l) => (
              <Select.Item
                key={l}
                value={l}
                className="cursor-pointer px-4 py-2.5 text-sm outline-none data-[highlighted]:bg-[var(--color-chip)]"
              >
                <Select.ItemText>{localeLabel[l]}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
