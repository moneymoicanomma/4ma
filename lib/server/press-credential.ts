import "server-only";

import type { PressCredentialPayload } from "@/lib/contracts/press-credential";
import { withDatabaseTransaction } from "@/lib/server/database";
import {
  getServerEnv,
  isDatabaseConfigured,
  type ServerEnv,
} from "@/lib/server/env";
import type { RequestAuditContext } from "@/lib/server/request-context";

type PressCredentialSubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "database_error";
    };

export async function submitPressCredential(
  payload: PressCredentialPayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv(),
): Promise<PressCredentialSubmitResult> {
  if (!isDatabaseConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured",
    };
  }

  try {
    await withDatabaseTransaction(
      {
        actorRole: "public",
        actorEmail: payload.email,
        requestId: requestContext.requestId,
        clientIp: requestContext.clientIp,
        origin: requestContext.requestOrigin,
        userAgent: requestContext.userAgent,
      },
      async (transaction) => {
        await transaction.query(
          `
            insert into app.press_credentials (
              full_name,
              email,
              media_outlet,
              document_number,
              coverage_type,
              coverage_needs,
              source,
              request_id,
              request_origin,
              request_ip_hash,
              user_agent,
              metadata
            )
            values (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              $8,
              $9,
              $10,
              $11,
              $12::jsonb
            )
          `,
          [
            payload.fullName,
            payload.email,
            payload.mediaOutlet,
            payload.documentNumber,
            payload.coverageType,
            payload.coverageNeeds,
            payload.source,
            requestContext.requestId,
            requestContext.requestOrigin,
            requestContext.requestIpHash,
            requestContext.userAgent,
            JSON.stringify({
              surface: "press-credential",
              eventName: "Money Moicano MMA 1",
            }),
          ],
        );
      },
    );

    return { ok: true };
  } catch (error) {
    console.error("press credential database insert failed", {
      error,
      email: payload.email,
      requestId: requestContext.requestId,
    });

    return {
      ok: false,
      reason: "database_error",
    };
  }
}
