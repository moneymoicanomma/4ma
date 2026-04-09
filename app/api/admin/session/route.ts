import { createHash, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import type { AdminSessionResponse } from "@/lib/contracts/admin-session";
import {
  ADMIN_DEFAULT_REDIRECT_PATH,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminCredentialFingerprint,
  createAdminSessionToken,
  getAdminAuthConfig,
  getSafeAdminRedirectPath
} from "@/lib/admin/auth";
import {
  getClientIdentifier,
  readJsonRequestBody
} from "@/lib/server/request-guards";
import { takeRateLimitToken } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ADMIN_AUTH_BODY_BYTES = 16 * 1024;

type AdminSessionRequestBody = {
  username?: string;
  password?: string;
  next?: string;
};

function normalizeUsername(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

function normalizePassword(input: unknown) {
  return typeof input === "string" ? input : "";
}

function sha256Buffer(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeCompare(left: string, right: string) {
  return timingSafeEqual(sha256Buffer(left), sha256Buffer(right));
}

function getNoStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff"
  };
}

function buildJsonResponse(payload: AdminSessionResponse, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: getNoStoreHeaders()
  });
}

export async function POST(request: NextRequest) {
  const config = getAdminAuthConfig();

  if (!config) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Autenticação do admin ainda não foi configurada no ambiente."
      },
      503
    );
  }

  const requester = getClientIdentifier(request);
  const rateLimit = takeRateLimitToken(`admin-auth:${requester}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));

    return NextResponse.json(
      {
        ok: false,
        message: "Muitas tentativas seguidas. Tenta novamente em alguns minutos."
      } satisfies AdminSessionResponse,
      {
        status: 429,
        headers: {
          ...getNoStoreHeaders(),
          "Retry-After": String(retryAfterSeconds)
        }
      }
    );
  }

  const requestBody = await readJsonRequestBody<AdminSessionRequestBody>(request, {
    maxBytes: MAX_ADMIN_AUTH_BODY_BYTES
  });

  if (!requestBody.ok) {
    return buildJsonResponse(
      {
        ok: false,
        message: requestBody.message
      },
      requestBody.status
    );
  }

  const username = normalizeUsername(requestBody.data.username);
  const password = normalizePassword(requestBody.data.password);
  const redirectTo = getSafeAdminRedirectPath(requestBody.data.next, ADMIN_DEFAULT_REDIRECT_PATH);

  if (!username || !password) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Informe usuário e senha."
      },
      400
    );
  }

  if (!safeCompare(username, config.username) || !safeCompare(password, config.password)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Credenciais inválidas."
      },
      401
    );
  }

  const credentialFingerprint = await createAdminCredentialFingerprint(
    config.username,
    config.password
  );
  const sessionToken = await createAdminSessionToken(
    config.username,
    config.sessionSecret,
    credentialFingerprint
  );

  const response = buildJsonResponse({
    ok: true,
    message: "Login realizado com sucesso.",
    redirectTo
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}

export async function DELETE() {
  const response = buildJsonResponse({
    ok: true,
    message: "Sessão encerrada.",
    redirectTo: ADMIN_DEFAULT_REDIRECT_PATH
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
