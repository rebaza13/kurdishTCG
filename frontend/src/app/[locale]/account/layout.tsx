import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** Tab title for this client-rendered page; private/session pages stay out of search. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("account"), robots: { index: false, follow: false } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
