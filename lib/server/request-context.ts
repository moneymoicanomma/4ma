import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";

import type { NextRequest } from "next/server";

export type RequestAuditContext = {
  requestId: string;
  requestOrigin: string | null;
  requestIpHash: string | null;
  clientIp: string | null;
  userAgent: string | null;
};

function normalizeOrigin(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getHeaderIp(value: string | null) {
  if (!value) {
    return null;
  }

  const candidates = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    if (isIP(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getClientIpFromRequest(request: NextRequest) {
  return (
    getHeaderIp(request.headers.get("x-forwarded-for")) ??
    getHeaderIp(request.headers.get("x-real-ip")) ??
    null
  );
}

export function getRequestOriginFromRequest(request: NextRequest) {
  return (
    normalizeOrigin(request.headers.get("origin")) ??
    normalizeOrigin(request.headers.get("referer")) ??
    request.nextUrl.origin
  );
}

export function getUserAgentFromRequest(request: NextRequest) {
  const userAgent = request.headers.get("user-agent")?.trim();

  return userAgent ? userAgent.slice(0, 1000) : null;
}

export function sha256Hex(value: string | null) {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}

export function getRequestIdFromRequest(request: NextRequest) {
  const headerValue =
    request.headers.get("x-request-id")?.trim() ||
    request.headers.get("x-amzn-trace-id")?.trim() ||
    request.headers.get("x-correlation-id")?.trim();

  return headerValue ? headerValue.slice(0, 200) : randomUUID();
}

export function buildRequestAuditContext(request: NextRequest): RequestAuditContext {
  const clientIp = getClientIpFromRequest(request);

  return {
    requestId: getRequestIdFromRequest(request),
    requestOrigin: getRequestOriginFromRequest(request),
    requestIpHash: sha256Hex(clientIp),
    clientIp,
    userAgent: getUserAgentFromRequest(request)
  };
}
