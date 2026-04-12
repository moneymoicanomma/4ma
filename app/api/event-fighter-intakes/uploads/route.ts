import { NextRequest } from "next/server";

import { requireAuthenticatedEventFighterPortalSession } from "@/app/api/event-fighter-intakes/_auth";
import {
  parseEventFighterIntakeUploadRequest,
  type EventFighterIntakeUploadInitResponse
} from "@/lib/contracts/event-fighter-intake";
import { publicApiResponse } from "@/lib/server/api-response";
import { createStagedFighterPhotoUploadTarget } from "@/lib/server/fighter-photo-storage";
import { getServerEnv, isFighterPhotoStorageConfigured } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import {
  getClientIdentifier,
  getPublicMutationCorsHeaders,
  isAllowedRequestOrigin,
  readJsonRequestBody
} from "@/lib/server/request-guards";
import { takeRateLimitToken } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EVENT_FIGHTER_UPLOAD_INIT_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const corsHeaders = getPublicMutationCorsHeaders(request, env.allowedFormOrigins);

  if (!isAllowedRequestOrigin(request, env.allowedFormOrigins)) {
    return publicApiResponse(
      {
        ok: false,
        message: "Origem não permitida."
      } satisfies EventFighterIntakeUploadInitResponse,
      {
        status: 403,
        headers: corsHeaders ?? undefined
      }
    );
  }

  if (!isFighterPhotoStorageConfigured(env)) {
    return publicApiResponse(
      {
        ok: false,
        message: "As credenciais de upload do R2 ainda não foram configuradas para o portal."
      } satisfies EventFighterIntakeUploadInitResponse,
      {
        status: 503,
        headers: corsHeaders ?? undefined
      }
    );
  }

  const authenticatedSession = await requireAuthenticatedEventFighterPortalSession(
    request,
    env,
    corsHeaders ?? undefined
  );

  if (!authenticatedSession.ok) {
    return authenticatedSession.response;
  }

  const requester = getClientIdentifier(request);
  const rateLimit = takeRateLimitToken(
    `event-fighter-intake-upload:${requester}:${authenticatedSession.authenticatedEmail}`,
    {
      limit: 4,
      windowMs: 10 * 60 * 1000
    }
  );

  if (!rateLimit.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));

    return publicApiResponse(
      {
        ok: false,
        message: "Muitas tentativas seguidas. Tenta novamente em alguns minutos."
      } satisfies EventFighterIntakeUploadInitResponse,
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
    maxBytes: MAX_EVENT_FIGHTER_UPLOAD_INIT_BODY_BYTES
  });

  if (!requestBody.ok) {
    return publicApiResponse(
      {
        ok: false,
        message: requestBody.message
      } satisfies EventFighterIntakeUploadInitResponse,
      {
        status: requestBody.status,
        headers: corsHeaders ?? undefined
      }
    );
  }

  const parsed = parseEventFighterIntakeUploadRequest(requestBody.data);

  if (!parsed.ok) {
    return publicApiResponse(
      {
        ok: false,
        message: parsed.message
      } satisfies EventFighterIntakeUploadInitResponse,
      {
        status: 400,
        headers: corsHeaders ?? undefined
      }
    );
  }

  const requestContext = buildRequestAuditContext(request);

  try {
    const uploads = await Promise.all(
      parsed.files.map((file) =>
        createStagedFighterPhotoUploadTarget({
          byteSize: file.byteSize,
          contentType: file.contentType,
          fieldName: file.fieldName,
          fileName: file.fileName,
          requestId: requestContext.requestId,
          env
        }).then((target) => ({
          ...target,
          fieldName: file.fieldName,
          fileName: file.fileName
        }))
      )
    );

    return publicApiResponse(
      {
        ok: true,
        uploads
      } satisfies EventFighterIntakeUploadInitResponse,
      {
        headers: corsHeaders ?? undefined
      }
    );
  } catch {
    return publicApiResponse(
      {
        ok: false,
        message: "Não foi possível preparar o upload das fotos agora."
      } satisfies EventFighterIntakeUploadInitResponse,
      {
        status: 502,
        headers: corsHeaders ?? undefined
      }
    );
  }
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
