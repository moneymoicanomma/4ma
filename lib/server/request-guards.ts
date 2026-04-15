import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";

import type { NextRequest } from "next/server";

const JSON_CONTENT_TYPE = "application/json";
const ALLOWED_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

type JsonRequestReadResult<TPayload> =
  | {
      ok: true;
      data: TPayload;
    }
  | {
      ok: false;
      status: 400 | 413 | 415;
      message: string;
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

function isAllowedOrigin(
  origin: string,
  requestOrigin: string,
  allowedOrigins: ReadonlySet<string>
) {
  return origin === requestOrigin || allowedOrigins.has(origin);
}

function getAllowedOriginFromHeaders(
  request: NextRequest,
  allowedOrigins: ReadonlySet<string>
): string | null {
  const requestOrigin = request.nextUrl.origin;
  const origin = normalizeOrigin(request.headers.get("origin"));

  if (origin) {
    return isAllowedOrigin(origin, requestOrigin, allowedOrigins) ? origin : null;
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();

  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    return null;
  }

  const refererOrigin = normalizeOrigin(request.headers.get("referer"));

  if (!refererOrigin) {
    return null;
  }

  return isAllowedOrigin(refererOrigin, requestOrigin, allowedOrigins) ? refererOrigin : null;
}

export function isAllowedRequestOrigin(
  request: NextRequest,
  allowedOrigins: ReadonlySet<string>
) {
  return getAllowedOriginFromHeaders(request, allowedOrigins) !== null;
}

const sameOriginOnly = new Set<string>();

export function isSameOriginRequest(request: NextRequest) {
  const requestOrigin = request.nextUrl.origin;
  return getAllowedOriginFromHeaders(request, sameOriginOnly) === requestOrigin;
}

export function getPublicMutationCorsHeaders(
  request: NextRequest,
  allowedOrigins: ReadonlySet<string>
) {
  const origin = getAllowedOriginFromHeaders(request, allowedOrigins);

  if (!origin) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
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

export function getClientIdentifier(request: NextRequest) {
  const forwardedFor = getHeaderIp(request.headers.get("x-forwarded-for"));

  if (forwardedFor) {
    return `ip:${forwardedFor}`;
  }

  const realIp = getHeaderIp(request.headers.get("x-real-ip"));

  if (realIp) {
    return `ip:${realIp}`;
  }

  const fallbackFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        acceptLanguage: request.headers.get("accept-language")?.slice(0, 160) ?? "",
        origin: normalizeOrigin(request.headers.get("origin")) ?? "",
        referer: normalizeOrigin(request.headers.get("referer")) ?? "",
        userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? ""
      })
    )
    .digest("hex")
    .slice(0, 24);

  return `anon:${fallbackFingerprint}`;
}

export async function readJsonRequestBody<TPayload>(
  request: NextRequest,
  options: {
    maxBytes: number;
  }
): Promise<JsonRequestReadResult<TPayload>> {
  const textDecoder = new TextDecoder();
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes(JSON_CONTENT_TYPE)) {
    return {
      ok: false,
      status: 415,
      message: "Formato da requisição inválido."
    };
  }

  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const parsedLength = Number.parseInt(contentLength, 10);

    if (!Number.isFinite(parsedLength) || parsedLength < 0) {
      return {
        ok: false,
        status: 400,
        message: "Corpo da requisição inválido."
      };
    }

    if (parsedLength > options.maxBytes) {
      return {
        ok: false,
        status: 413,
        message: "Requisição grande demais."
      };
    }
  }

  if (!request.body) {
    return {
      ok: false,
      status: 400,
      message: "Corpo da requisição inválido."
    };
  }

  const reader = request.body.getReader();
  let receivedBytes = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      receivedBytes += value.byteLength;

      if (receivedBytes > options.maxBytes) {
        await reader.cancel("request body too large");

        return {
          ok: false,
          status: 413,
          message: "Requisição grande demais."
        };
      }

      body += textDecoder.decode(value, { stream: true });
    }

    body += textDecoder.decode();
  } finally {
    reader.releaseLock();
  }

  if (!body) {
    return {
      ok: false,
      status: 400,
      message: "Corpo da requisição inválido."
    };
  }

  try {
    return {
      ok: true,
      data: JSON.parse(body) as TPayload
    };
  } catch {
    return {
      ok: false,
      status: 400,
      message: "Corpo da requisição inválido."
    };
  }
}
