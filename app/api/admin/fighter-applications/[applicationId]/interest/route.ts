import { NextRequest, NextResponse } from "next/server";

import {
  getCurrentAdminSessionIdentity,
  type AdminSessionIdentity,
} from "@/lib/server/admin-session";
import { withDatabaseTransaction } from "@/lib/server/database";
import {
  getAdminWriteUpstreamBearerToken,
  getServerEnv,
  isAdminWriteUpstreamConfigured,
  isDatabaseConfigured,
} from "@/lib/server/env";
import { postJsonToUpstream, UpstreamApiError } from "@/lib/server/http";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import { isSameOriginRequest, readJsonRequestBody } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ADMIN_INTEREST_BODY_BYTES = 8 * 1024;
const FIGHTER_APPLICATION_EDITORIAL_INTEREST_VALUES = new Set([
  "interessante",
  "talvez_no_futuro",
  "nao_interessante",
  "bizarro",
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AdminFighterApplicationInterestRequestBody = {
  editorialInterest?: string | null;
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

function canEditFighterApplications(identity: AdminSessionIdentity) {
  return identity.role === "admin" || identity.role === "operator";
}

function normalizeEditorialInterest(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (!FIGHTER_APPLICATION_EDITORIAL_INTEREST_VALUES.has(normalized)) {
    return undefined;
  }

  return normalized;
}

type RouteContext = {
  params: Promise<{
    applicationId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
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

  if (!canEditFighterApplications(identity)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Seu perfil não tem permissão para editar classificações."
      },
      403
    );
  }

  const { applicationId } = await context.params;

  if (!uuidPattern.test(applicationId)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "ID de atleta inválido."
      },
      400
    );
  }

  const requestBody = await readJsonRequestBody<AdminFighterApplicationInterestRequestBody>(
    request,
    {
      maxBytes: MAX_ADMIN_INTEREST_BODY_BYTES
    }
  );

  if (!requestBody.ok) {
    return buildJsonResponse(
      {
        ok: false,
        message: requestBody.message
      },
      requestBody.status
    );
  }

  const editorialInterest = normalizeEditorialInterest(requestBody.data?.editorialInterest);

  if (editorialInterest === undefined) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Classificação inválida."
      },
      400
    );
  }

  const requestContext = buildRequestAuditContext(request);

  if (!isDatabaseConfigured(env)) {
    if (!isAdminWriteUpstreamConfigured(env)) {
      return buildJsonResponse(
        {
          ok: false,
          message: "Banco de dados indisponível neste ambiente."
        },
        503
      );
    }

    try {
      const upstreamUrl = `${env.upstreamApiBaseUrl}/v1/admin/fighter-applications/${encodeURIComponent(
        applicationId
      )}/interest`;
      const upstreamResponse = await postJsonToUpstream(
        upstreamUrl,
        {
          payload: {
            editorialInterest
          },
          actor: {
            accountId: identity.kind === "account" ? identity.accountId : null,
            email: identity.username,
            role: identity.role
          },
          requestContext
        },
        {
          bearerToken: getAdminWriteUpstreamBearerToken(env)!,
          timeoutMs: env.upstreamRequestTimeoutMs
        }
      );
      const payload = (await upstreamResponse
        .json()
        .catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            editorialInterest?: string | null;
          }
        | null;

      if (!payload?.ok) {
        return buildJsonResponse(
          {
            ok: false,
            message: payload?.message ?? "Não foi possível salvar agora. Tente novamente em instantes."
          },
          503
        );
      }

      return buildJsonResponse({
        ok: true,
        message: payload.message ?? "Classificação atualizada com sucesso.",
        editorialInterest: payload.editorialInterest ?? null
      });
    } catch (error) {
      if (error instanceof UpstreamApiError) {
        if (error.status === 404) {
          return buildJsonResponse(
            {
              ok: false,
              message: "Atleta não encontrado."
            },
            404
          );
        }

        if (error.status === 400) {
          return buildJsonResponse(
            {
              ok: false,
              message: "Classificação inválida."
            },
            400
          );
        }

        if (error.status === 401 || error.status === 403) {
          return buildJsonResponse(
            {
              ok: false,
              message: "Seu perfil não tem permissão para editar classificações."
            },
            403
          );
        }
      }

      console.error("[admin fighter-applications] upstream update failed", {
        error,
        applicationId,
        editorialInterest
      });

      return buildJsonResponse(
        {
          ok: false,
          message: "Não foi possível salvar agora. Tente novamente em instantes."
        },
        503
      );
    }
  }

  try {
    const result = await withDatabaseTransaction(
      {
        actorId: identity.kind === "account" ? identity.accountId : null,
        actorRole: identity.role,
        actorEmail: identity.username,
        requestId: requestContext.requestId,
        clientIp: requestContext.clientIp,
        origin: requestContext.requestOrigin,
        userAgent: requestContext.userAgent
      },
      async (transaction) =>
        transaction.query<{
          editorialInterest: string | null;
        }>(
          `
            update app.fighter_applications
            set
              editorial_interest = $2::app.fighter_application_editorial_interest_enum,
              updated_at = now()
            where id = $1::uuid
            returning editorial_interest::text as "editorialInterest"
          `,
          [applicationId, editorialInterest]
        )
    );

    const row = result.rows[0];

    if (!row) {
      return buildJsonResponse(
        {
          ok: false,
          message: "Atleta não encontrado."
        },
        404
      );
    }

    return buildJsonResponse({
      ok: true,
      message: "Classificação atualizada com sucesso.",
      editorialInterest: row.editorialInterest ?? null
    });
  } catch (error) {
    console.error("[admin fighter-applications] failed to update editorial interest", {
      error,
      applicationId,
      editorialInterest
    });

    return buildJsonResponse(
      {
        ok: false,
        message: "Não foi possível salvar agora. Tente novamente em instantes."
      },
      503
    );
  }
}
