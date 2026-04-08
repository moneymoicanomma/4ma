import "server-only";

import type { NextRequest } from "next/server";

export function isAllowedRequestOrigin(
  request: NextRequest,
  allowedOrigins: ReadonlySet<string>
) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === request.nextUrl.origin || allowedOrigins.has(origin);
}

export function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const firstForwarded = forwardedFor?.split(",")[0]?.trim();

  if (firstForwarded) {
    return firstForwarded;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();

  if (realIp) {
    return realIp;
  }

  return "anonymous";
}
