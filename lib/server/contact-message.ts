import "server-only";

import type { ContactMessagePayload } from "@/lib/contracts/contact-message";
import { withDatabaseTransaction } from "@/lib/server/database";
import {
  getPublicWriteUpstreamBearerToken,
  getServerEnv,
  isDatabaseConfigured,
  isPublicUpstreamConfigured,
  type ServerEnv
} from "@/lib/server/env";
import { postJsonToUpstream } from "@/lib/server/http";
import type { RequestAuditContext } from "@/lib/server/request-context";

type ContactMessageSubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function submitContactMessage(
  payload: ContactMessagePayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<ContactMessageSubmitResult> {
  if (isDatabaseConfigured(env)) {
    try {
      await withDatabaseTransaction(
        {
          actorRole: "public",
          actorEmail: payload.email,
          requestId: requestContext.requestId,
          clientIp: requestContext.clientIp,
          origin: requestContext.requestOrigin,
          userAgent: requestContext.userAgent
        },
        async (transaction) => {
          await transaction.query(
            `
              insert into app.contact_messages (
                recipient_email,
                full_name,
                email,
                subject,
                message,
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
                $11::jsonb
              )
            `,
            [
              payload.recipientEmail,
              payload.fullName,
              payload.email,
              payload.subject,
              payload.message,
              payload.source,
              requestContext.requestId,
              requestContext.requestOrigin,
              requestContext.requestIpHash,
              requestContext.userAgent,
              JSON.stringify({
                surface: "contact-page"
              })
            ]
          );
        }
      );

      return { ok: true };
    } catch {
      if (!isPublicUpstreamConfigured(env)) {
        return {
          ok: false,
          reason: "upstream_error"
        };
      }
    }
  }

  if (!isPublicUpstreamConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured"
    };
  }

  try {
    await postJsonToUpstream(
      `${env.upstreamApiBaseUrl}${env.contactMessageSubmitPath}`,
      {
        payload,
        requestContext
      },
      {
        bearerToken: getPublicWriteUpstreamBearerToken(env)!,
        timeoutMs: env.upstreamRequestTimeoutMs
      }
    );

    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "upstream_error"
    };
  }
}
