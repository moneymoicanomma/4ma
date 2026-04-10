import { createHash, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import type { EventFighterSessionResponse } from "@/lib/contracts/event-fighter-session";
import {
  authenticateAccountWithPassword,
  revokeSessionToken
} from "@/lib/server/auth-store";
import {
  EVENT_FIGHTER_ACCESS_PATH,
  EVENT_FIGHTER_SESSION_COOKIE_NAME,
  EVENT_FIGHTER_SESSION_MAX_AGE_SECONDS,
  createEventFighterCredentialFingerprint,
  createEventFighterSessionToken,
  getEventFighterAuthConfig,
  getSafeEventFighterRedirectPath,
  isValidEventFighterEmail,
  normalizeEventFighterEmail
} from "@/lib/event-fighter/auth";
import { getServerEnv, isDatabaseConfigured } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import {
  getClientIdentifier,
  readJsonRequestBody
} from "@/lib/server/request-guards";
import { takeRateLimitToken } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENT_FIGHTER_AUTH_BODY_BYTES = 16 * 1024;

type EventFighterSessionRequestBody = {
  email?: string;
  password?: string;
  next?: string;
};

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

function buildJsonResponse(payload: EventFighterSessionResponse, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: getNoStoreHeaders()
  });
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const config = getEventFighterAuthConfig();
  const requester = getClientIdentifier(request);
  const rateLimit = takeRateLimitToken(`event-fighter-auth:${requester}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));

    return NextResponse.json(
      {
        ok: false,
        message: "Muitas tentativas seguidas. Tenta novamente em alguns minutos."
      } satisfies EventFighterSessionResponse,
      {
        status: 429,
        headers: {
          ...getNoStoreHeaders(),
          "Retry-After": String(retryAfterSeconds)
        }
      }
    );
  }

  const requestBody = await readJsonRequestBody<EventFighterSessionRequestBody>(request, {
    maxBytes: MAX_EVENT_FIGHTER_AUTH_BODY_BYTES
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

  const email = normalizeEventFighterEmail(requestBody.data.email ?? "");
  const password = normalizePassword(requestBody.data.password);
  const redirectTo = getSafeEventFighterRedirectPath(
    requestBody.data.next,
    EVENT_FIGHTER_ACCESS_PATH
  );

  if (!email || !password) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Informe email e senha."
      },
      400
    );
  }

  if (!isValidEventFighterEmail(email)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Informe um email válido."
      },
      400
    );
  }

  if (isDatabaseConfigured(env)) {
    const authenticatedSession = await authenticateAccountWithPassword({
      acceptedRoles: ["fighter"],
      email,
      password,
      requestContext: buildRequestAuditContext(request),
      sessionKind: "fighter_portal",
      sessionMaxAgeSeconds: EVENT_FIGHTER_SESSION_MAX_AGE_SECONDS,
      sessionMetadata: {
        surface: "event-fighter-access"
      }
    }).catch(() => null);

    if (authenticatedSession) {
      const response = buildJsonResponse({
        ok: true,
        message: "Acesso liberado.",
        redirectTo
      });

      response.cookies.set({
        name: EVENT_FIGHTER_SESSION_COOKIE_NAME,
        value: authenticatedSession.sessionToken,
        httpOnly: true,
        maxAge: EVENT_FIGHTER_SESSION_MAX_AGE_SECONDS,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production"
      });

      return response;
    }
  }

  if (!safeCompare(password, config.password)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Credenciais inválidas."
      },
      401
    );
  }

  const credentialFingerprint = createEventFighterCredentialFingerprint(
    email,
    config.password
  );
  const sessionToken = createEventFighterSessionToken(
    email,
    config.sessionSecret,
    credentialFingerprint
  );

  const response = buildJsonResponse({
    ok: true,
    message: "Acesso liberado.",
    redirectTo
  });

  response.cookies.set({
    name: EVENT_FIGHTER_SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    maxAge: EVENT_FIGHTER_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  const env = getServerEnv();
  const sessionToken = request.cookies.get(EVENT_FIGHTER_SESSION_COOKIE_NAME)?.value;

  if (isDatabaseConfigured(env) && sessionToken) {
    await revokeSessionToken(sessionToken).catch(() => {
      // Clearing the cookie is more important than failing logout on a revoke race.
    });
  }

  const response = buildJsonResponse({
    ok: true,
    message: "Sessão encerrada.",
    redirectTo: EVENT_FIGHTER_ACCESS_PATH
  });

  response.cookies.set({
    name: EVENT_FIGHTER_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  return response;
}
