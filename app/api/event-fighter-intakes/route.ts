import { NextRequest } from "next/server";

import {
  parseEventFighterIntakeFormData,
  type EventFighterIntakePublicResponse
} from "@/lib/contracts/event-fighter-intake";
import { publicApiResponse } from "@/lib/server/api-response";
import { submitEventFighterIntake } from "@/lib/server/event-fighter-intake";
import {
  EVENT_FIGHTER_SESSION_COOKIE_NAME,
  createEventFighterCredentialFingerprint,
  getEventFighterAuthConfig,
  verifyEventFighterSessionToken
} from "@/lib/event-fighter/auth";
import {
  getClientIdentifier,
  getPublicMutationCorsHeaders,
  isAllowedRequestOrigin
} from "@/lib/server/request-guards";
import { getServerEnv } from "@/lib/server/env";
import { takeRateLimitToken } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const successPayload: EventFighterIntakePublicResponse = {
  ok: true,
  message: "Ficha recebida. Se precisarmos complementar algo, a equipe entra em contato."
};

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const corsHeaders = getPublicMutationCorsHeaders(request, env.allowedFormOrigins);

  if (!isAllowedRequestOrigin(request, env.allowedFormOrigins)) {
    return publicApiResponse(
      {
        ok: false,
        message: "Origem não permitida."
      },
      {
        status: 403,
        headers: corsHeaders ?? undefined
      }
    );
  }

  const authConfig = getEventFighterAuthConfig();
  const sessionToken = request.cookies.get(EVENT_FIGHTER_SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
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

  const session = await verifyEventFighterSessionToken(sessionToken, authConfig.sessionSecret);

  if (!session) {
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

  const credentialFingerprint = await createEventFighterCredentialFingerprint(
    session.sub,
    authConfig.password
  );

  if (session.cf !== credentialFingerprint) {
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

  const requester = getClientIdentifier(request);
  const rateLimit = takeRateLimitToken(`event-fighter-intake:${requester}`, {
    limit: 2,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));

    return publicApiResponse(
      {
        ok: false,
        message: "Muitas tentativas seguidas. Tenta novamente em alguns minutos."
      },
      {
        status: 429,
        headers: {
          ...corsHeaders,
          "Retry-After": String(retryAfterSeconds)
        }
      }
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return publicApiResponse(
      {
        ok: false,
        message: "Não foi possível ler os dados enviados."
      },
      {
        status: 400,
        headers: corsHeaders ?? undefined
      }
    );
  }

  const parsed = parseEventFighterIntakeFormData(formData, session.sub);

  if (!parsed.ok) {
    return publicApiResponse(
      {
        ok: false,
        message: parsed.message
      },
      {
        status: 400,
        headers: corsHeaders ?? undefined
      }
    );
  }

  if (parsed.honeypotTriggered || !parsed.data) {
    return publicApiResponse(successPayload, {
      headers: corsHeaders ?? undefined
    });
  }

  const result = await submitEventFighterIntake(parsed.data, env);

  if (!result.ok) {
    const status = result.reason === "not_configured" ? 503 : 502;

    return publicApiResponse(
      {
        ok: false,
        message: "Serviço temporariamente indisponível. Tenta novamente daqui a pouco."
      },
      {
        status,
        headers: corsHeaders ?? undefined
      }
    );
  }

  return publicApiResponse(successPayload, {
    headers: corsHeaders ?? undefined
  });
}

export async function OPTIONS(request: NextRequest) {
  const env = getServerEnv();
  const hasOriginHeader = Boolean(request.headers.get("origin"));
  const corsHeaders = getPublicMutationCorsHeaders(request, env.allowedFormOrigins);

  return new Response(null, {
    status: hasOriginHeader && !corsHeaders ? 403 : 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Cache-Control": "no-store, max-age=0",
      ...(corsHeaders ?? {})
    }
  });
}
