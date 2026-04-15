import { NextRequest, NextResponse } from "next/server";

import type { FantasyMockEvent } from "@/lib/fantasy/mock-data";
import { getCurrentAdminSessionIdentity } from "@/lib/server/admin-session";
import { getServerEnv } from "@/lib/server/env";
import { saveFantasyEvent } from "@/lib/server/fantasy";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import { isSameOriginRequest, readJsonRequestBody } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ADMIN_FANTASY_EVENT_BODY_BYTES = 256 * 1024;

type AdminFantasyEventRequestBody = {
  event?: FantasyMockEvent;
};

function getNoStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff"
  };
}

function buildJsonResponse(payload: object, status = 200) {
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
  const identity = await getCurrentAdminSessionIdentity(env);

  if (!identity) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Sessão administrativa inválida."
      },
      401
    );
  }

  const requestBody = await readJsonRequestBody<AdminFantasyEventRequestBody>(request, {
    maxBytes: MAX_ADMIN_FANTASY_EVENT_BODY_BYTES
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

  if (!requestBody.data?.event || typeof requestBody.data.event !== "object") {
    return buildJsonResponse(
      {
        ok: false,
        message: "Evento inválido para salvar."
      },
      400
    );
  }

  try {
    const payload = await saveFantasyEvent(
      requestBody.data.event,
      identity,
      buildRequestAuditContext(request),
      env
    );

    if (!payload) {
      return buildJsonResponse(
        {
          ok: false,
          message: "Não foi possível salvar o evento agora. Tenta novamente em instantes."
        },
        503
      );
    }

    return buildJsonResponse(payload);
  } catch (error) {
    if (error instanceof Error && error.name === "FantasyAdminEventSaveValidationError") {
      return buildJsonResponse(
        {
          ok: false,
          message: error.message
        },
        400
      );
    }

    console.error("[admin fantasy] save failed", error);

    return buildJsonResponse(
      {
        ok: false,
        message: "Não foi possível salvar o evento agora. Tenta novamente em instantes."
      },
      503
    );
  }
}
