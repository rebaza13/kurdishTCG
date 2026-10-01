import "server-only";
import { NextResponse } from "next/server";

/**
 * Small fixed-window limiter, keyed by `bucket + client IP`. In-memory, so the
 * budget is per server instance (on Vercel, per warm lambda) — enough to blunt
 * a single client hammering an endpoint, not a distributed-attack defense
 * (use Vercel Firewall rate limiting for that).
 */
const hits = new Map<string, { count: number; resetAt: number }>();
const MAX_KEYS = 5_000;

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** Returns a 429 response when over the limit, otherwise null. */
export function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  const key = `${bucket}:${clientIp(request)}`;

  if (hits.size > MAX_KEYS) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    if (hits.size > MAX_KEYS) hits.clear();
  }

  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count <= limit) return null;

  return NextResponse.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) } }
  );
}
