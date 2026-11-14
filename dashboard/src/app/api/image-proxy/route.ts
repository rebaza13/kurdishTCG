/**
 * Same-origin relay for already-uploaded product images, so the image editor
 * can draw them onto a canvas. The public R2 bucket (r2.dev) sends no CORS
 * headers, which would taint the canvas and block "Adjust". Only our own
 * image hosts are relayed — this is not an open proxy.
 */
const ALLOWED_HOSTS = new Set(
  [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    "https://pub-b7fec24279c14c088e36e18e21ddf97c.r2.dev",
  ]
    .filter((u): u is string => !!u)
    .map((u) => new URL(u).hostname)
);

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  let target: URL;
  try {
    target = new URL(raw ?? "");
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  const upstream = await fetch(target, { cache: "no-store" }).catch(() => null);
  const type = upstream?.headers.get("content-type") ?? "";
  if (!upstream?.ok || !type.startsWith("image/")) {
    return new Response("not found", { status: 404 });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": type, "Cache-Control": "private, max-age=300" },
  });
}
