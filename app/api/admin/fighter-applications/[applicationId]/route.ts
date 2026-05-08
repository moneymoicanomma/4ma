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
import { deleteJsonFromUpstream, UpstreamApiError } from "@/lib/server/http";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import { isSameOriginRequest } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getNoStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Referrer-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  };
}

function buildJsonResponse(payload: object, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: getNoStoreHeaders(),
  });
}

function canDeleteFighterApplications(identity: AdminSessionIdentity) {
  return identity.role === "admin" || identity.role === "operator";
}

type RouteContext = {
  params: Promise<{
    applicationId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Origem não permitida.",
      },
      403,
    );
  }

  const env = getServerEnv();
  const identity = await getCurrentAdminSessionIdentity(env);

  if (!identity) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Sessão administrativa inválida.",
      },
      401,
    );
  }

  if (!canDeleteFighterApplications(identity)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "Seu perfil não tem permissão para excluir cadastros.",
      },
      403,
    );
  }

  const { applicationId } = await context.params;

  if (!uuidPattern.test(applicationId)) {
    return buildJsonResponse(
      {
        ok: false,
        message: "ID de atleta inválido.",
      },
      400,
    );
  }

  const requestContext = buildRequestAuditContext(request);

  if (!isDatabaseConfigured(env)) {
    if (!isAdminWriteUpstreamConfigured(env)) {
      return buildJsonResponse(
        {
          ok: false,
          message: "Banco de dados indisponível neste ambiente.",
        },
        503,
      );
    }

    try {
      const upstreamUrl = `${env.upstreamApiBaseUrl}/v1/admin/fighter-applications/${encodeURIComponent(
        applicationId,
      )}`;
      const upstreamResponse = await deleteJsonFromUpstream(
        upstreamUrl,
        {
          actor: {
            accountId: identity.kind === "account" ? identity.accountId : null,
            email: identity.username,
            role: identity.role,
          },
          requestContext,
        },
        {
          bearerToken: getAdminWriteUpstreamBearerToken(env)!,
          timeoutMs: env.upstreamRequestTimeoutMs,
        },
      );
      const payload = (await upstreamResponse.json().catch(() => null)) as
        | {
            ok?: boolean;
            message?: string;
            deletedApplicationId?: string;
          }
        | null;

      if (!payload?.ok) {
        return buildJsonResponse(
          {
            ok: false,
            message: payload?.message ?? "Não foi possível excluir agora. Tente novamente em instantes.",
          },
          503,
        );
      }

      return buildJsonResponse({
        ok: true,
        message: payload.message ?? "Cadastro excluído com sucesso.",
        deletedApplicationId: payload.deletedApplicationId ?? applicationId,
      });
    } catch (error) {
      if (error instanceof UpstreamApiError) {
        if (error.status === 404) {
          return buildJsonResponse(
            {
              ok: false,
              message: "Atleta não encontrado.",
            },
            404,
          );
        }

        if (error.status === 401 || error.status === 403) {
          return buildJsonResponse(
            {
              ok: false,
              message: "Seu perfil não tem permissão para excluir cadastros.",
            },
            403,
          );
        }
      }

      console.error("[admin fighter-applications] upstream delete failed", {
        error,
        applicationId,
      });

      return buildJsonResponse(
        {
          ok: false,
          message: "Não foi possível excluir agora. Tente novamente em instantes.",
        },
        503,
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
        userAgent: requestContext.userAgent,
      },
      async (transaction) =>
        transaction.query<{ id: string }>(
          `
            delete from app.fighter_applications
            where id = $1::uuid
            returning id
          `,
          [applicationId],
        ),
    );

    const row = result.rows[0];

    if (!row) {
      return buildJsonResponse(
        {
          ok: false,
          message: "Atleta não encontrado.",
        },
        404,
      );
    }

    return buildJsonResponse({
      ok: true,
      message: "Cadastro excluído com sucesso.",
      deletedApplicationId: row.id,
    });
  } catch (error) {
    console.error("[admin fighter-applications] failed to delete application", {
      error,
      applicationId,
    });

    return buildJsonResponse(
      {
        ok: false,
        message: "Não foi possível excluir agora. Tente novamente em instantes.",
      },
      503,
    );
  }
}
