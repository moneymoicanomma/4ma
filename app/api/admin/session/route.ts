import { createHash, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import type { AdminSessionResponse } from "@/lib/contracts/admin-session";
import {
  authenticateAccountWithPassword,
  revokeSessionToken
} from "@/lib/server/auth-store";
import {
  ADMIN_DEFAULT_REDIRECT_PATH,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminCredentialFingerprint,
  createAdminSessionToken,
  getAdminAuthConfig,
  getSafeAdminRedirectPath
} from "@/lib/admin/auth";
import { getServerEnv, isDatabaseConfigured } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import {
  getClientIdentifier,
  isSameOriginRequest,
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

function normalizeIdentifier(input: unknown) {
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
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Origem não permitida."
      },
      403
    );
  }

  const env = getServerEnv();
  const config = getAdminAuthConfig();
  const databaseConfigured = isDatabaseConfigured(env);

  if (!databaseConfigured && !config) {
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

  const identifier = normalizeIdentifier(requestBody.data.username);
  const password = normalizePassword(requestBody.data.password);
  const redirectTo = getSafeAdminRedirectPath(requestBody.data.next, ADMIN_DEFAULT_REDIRECT_PATH);

  if (!identifier || !password) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Informe usuário e senha."
      },
      400
    );
  }

  if (databaseConfigured) {
    const auditContext = buildRequestAuditContext(request);
    const authenticatedSession = await authenticateAccountWithPassword({
      acceptedRoles: ["admin", "operator"],
      email: identifier.toLowerCase(),
      password,
      requestContext: auditContext,
      sessionKind: "backoffice",
      sessionMaxAgeSeconds: ADMIN_SESSION_MAX_AGE_SECONDS,
      sessionMetadata: {
        surface: "admin-login"
      }
    }).catch(() => null);

    if (!authenticatedSession) {
      if (!config) {
        return buildJsonResponse(
          {
            ok: false,
            message: "Credenciais inválidas."
          },
          401
        );
      }
    } else {
      const response = buildJsonResponse({
        ok: true,
        message: "Login realizado com sucesso.",
        redirectTo
      });

      response.cookies.set({
        name: ADMIN_SESSION_COOKIE_NAME,
        value: authenticatedSession.sessionToken,
        httpOnly: true,
        maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });

      return response;
    }
  }

  if (!config) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Autenticação do admin ainda não foi configurada no ambiente."
      },
      503
    );
  }

  if (!safeCompare(identifier, config.username) || !safeCompare(password, config.password)) {
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

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Origem não permitida."
      },
      403
    );
  }

  const env = getServerEnv();
  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (isDatabaseConfigured(env) && sessionToken) {
    await revokeSessionToken(sessionToken).catch(() => {
      // Clearing the cookie is more important than failing logout on a revoke race.
    });
  }

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
