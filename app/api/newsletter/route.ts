import { NextRequest } from "next/server";

import {
  parseNewsletterSubscription,
  type PublicMutationResponse
} from "@/lib/contracts/newsletter";
import { publicApiResponse } from "@/lib/server/api-response";
import { getServerEnv } from "@/lib/server/env";
import { subscribeToNewsletter } from "@/lib/server/newsletter";
import { getClientIdentifier, isAllowedRequestOrigin } from "@/lib/server/request-guards";
import { takeRateLimitToken } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const successPayload: PublicMutationResponse = {
  ok: true,
  message: "Inscrição recebida. Se fizer sentido, te chamamos no e-mail."
};

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  if (!isAllowedRequestOrigin(request, env.allowedFormOrigins)) {
    return publicApiResponse(
      {
        ok: false,
        message: "Origem não permitida."
      },
      { status: 403 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return publicApiResponse(
      {
        ok: false,
        message: "Formato da requisição inválido."
      },
      { status: 415 }
    );
  }

  const requester = getClientIdentifier(request);
  const rateLimit = takeRateLimitToken(`newsletter:${requester}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000
  });

  if (!rateLimit.ok) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
    );

    return publicApiResponse(
      {
        ok: false,
        message: "Muitas tentativas seguidas. Tenta de novo em instantes."
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds)
        }
      }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = parseNewsletterSubscription(payload);

  if (!parsed.ok) {
    return publicApiResponse(
      {
        ok: false,
        message: parsed.message
      },
      { status: 400 }
    );
  }

  if (parsed.honeypotTriggered) {
    return publicApiResponse(successPayload);
  }

  const result = await subscribeToNewsletter(parsed.data);

  if (!result.ok) {
    const status = result.reason === "not_configured" ? 503 : 502;

    return publicApiResponse(
      {
        ok: false,
        message: "Serviço temporariamente indisponível. Tenta novamente daqui a pouco."
      },
      { status }
    );
  }

  return publicApiResponse(successPayload);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
