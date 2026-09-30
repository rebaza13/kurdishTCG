import { NextResponse } from "next/server";
import { getProducts } from "@/lib/data";
import { locales, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

function parseLocale(value: string | null): Locale {
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : "en";
}

/** Powers the homepage packs grid's client-side pagination. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = parseLocale(searchParams.get("locale"));
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(searchParams.get("pageSize")) || 24));

  try {
    const result = await getProducts(undefined, { page, pageSize, sort: "newest" }, locale);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
