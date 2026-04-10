import { NextRequest } from "next/server";

import {
  parseContactMessage,
  type ContactMessagePublicResponse
} from "@/lib/contracts/contact-message";
import { publicApiResponse } from "@/lib/server/api-response";
import { submitContactMessage } from "@/lib/server/contact-message";
import { getServerEnv } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import {
  getClientIdentifier,
  getPublicMutationCorsHeaders,
  isAllowedRequestOrigin,
  readJsonRequestBody
} from "@/lib/server/request-guards";
import { takeRateLimitToken } from "@/lib/server/rate-limit";
import { verifyTurnstileToken } from "@/lib/server/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PUBLIC_MUTATION_BODY_BYTES = 64 * 1024;

const successPayload: ContactMessagePublicResponse = {
  ok: true,
  message: "Mensagem recebida. A equipe responde pelo contato@moneymoicanomma.com.br."
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

  const requester = getClientIdentifier(request);
  const rateLimit = takeRateLimitToken(`contact-message:${requester}`, {
    limit: 4,
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

  const requestBody = await readJsonRequestBody(request, {
    maxBytes: MAX_PUBLIC_MUTATION_BODY_BYTES
  });

  if (!requestBody.ok) {
    return publicApiResponse(
      {
        ok: false,
        message: requestBody.message
      },
      {
        status: requestBody.status,
        headers: corsHeaders ?? undefined
      }
    );
  }

  const requestContext = buildRequestAuditContext(request);
  const requestData = requestBody.data as Record<string, unknown>;
  const turnstileToken =
    typeof requestData.turnstileToken === "string" ? requestData.turnstileToken : "";
  const turnstileResult = await verifyTurnstileToken(
    turnstileToken,
    {
      clientIp: requestContext.clientIp,
      requestId: requestContext.requestId
    },
    env
  );

  if (!turnstileResult.ok && turnstileResult.reason !== "not_configured") {
    return publicApiResponse(
      {
        ok: false,
        message: "Confirme que você é humano antes de enviar."
      },
      {
        status: 400,
        headers: corsHeaders ?? undefined
      }
    );
  }

  const parsed = parseContactMessage(requestBody.data);

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

  if (parsed.honeypotTriggered) {
    return publicApiResponse(successPayload, {
      headers: corsHeaders ?? undefined
    });
  }

  const result = await submitContactMessage(parsed.data, requestContext, env);

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
