import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    ...locales.flatMap((locale) => [
      `/${locale}/account`,
      `/${locale}/checkout`,
      `/${locale}/cart`,
    ]),
  ];

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
