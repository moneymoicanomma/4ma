import { type NextRequest } from "next/server";

import { publicApiResponse } from "@/lib/server/api-response";
import { getSessionAccountFromToken } from "@/lib/server/auth-store";
import {
  EVENT_FIGHTER_SESSION_COOKIE_NAME,
  createEventFighterSessionFingerprint,
  getEventFighterAuthConfig,
  verifyEventFighterSessionToken
} from "@/lib/event-fighter/auth";
import {
  type ServerEnv,
  isDatabaseConfigured
} from "@/lib/server/env";

type AuthenticatedEventFighterPortalSession =
  | {
      ok: true;
      authenticatedAccountId: string | null;
      authenticatedEmail: string;
    }
  | {
      ok: false;
      response: Response;
    };

function buildExpiredSessionResponse(corsHeaders?: HeadersInit) {
  return publicApiResponse(
    {
      ok: false,
      message: "Sua sessão expirou. Faça login novamente para enviar a ficha."
    },
    {
      status: 401,
      headers: corsHeaders ?? undefined
    }
  );
}

export async function requireAuthenticatedEventFighterPortalSession(
  request: NextRequest,
  env: ServerEnv,
  corsHeaders?: HeadersInit
): Promise<AuthenticatedEventFighterPortalSession> {
  if (!env.eventFighterPortalEnabled) {
    return {
      ok: false,
      response: publicApiResponse(
        {
          ok: false,
          message:
            "A ficha privada dos atletas está temporariamente fora do ar enquanto a infraestrutura é finalizada."
        },
        {
          status: 503,
          headers: corsHeaders ?? undefined
        }
      )
    };
  }

  const sessionToken = request.cookies.get(EVENT_FIGHTER_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return {
      ok: false,
      response: buildExpiredSessionResponse(corsHeaders)
    };
  }

  let authenticatedAccountId: string | null = null;
  let authenticatedEmail: string | null = null;

  if (isDatabaseConfigured(env)) {
    const databaseSession = await getSessionAccountFromToken({
      acceptedRoles: ["fighter"],
      sessionKind: "fighter_portal",
      sessionToken
    }).catch(() => null);

    authenticatedAccountId = databaseSession?.accountId ?? null;
    authenticatedEmail = databaseSession?.email ?? null;
  } else {
    const authConfig = getEventFighterAuthConfig();

    if (!authConfig.sessionSecret) {
      return {
        ok: false,
        response: buildExpiredSessionResponse(corsHeaders)
      };
    }

    const session = verifyEventFighterSessionToken(sessionToken, authConfig.sessionSecret);

    if (!session) {
      return {
        ok: false,
        response: buildExpiredSessionResponse(corsHeaders)
      };
    }

    const sessionFingerprint = createEventFighterSessionFingerprint(
      session.sub,
      authConfig.sessionSecret
    );

    if (session.cf !== sessionFingerprint) {
      return {
        ok: false,
        response: buildExpiredSessionResponse(corsHeaders)
      };
    }

    authenticatedEmail = session.sub;
  }

  if (!authenticatedEmail) {
    return {
      ok: false,
      response: buildExpiredSessionResponse(corsHeaders)
    };
  }

  return {
    ok: true,
    authenticatedAccountId,
    authenticatedEmail
  };
}
