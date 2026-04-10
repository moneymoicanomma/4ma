import "server-only";

import type { PartnerInquiryPayload } from "@/lib/contracts/partner-inquiry";
import { withDatabaseTransaction } from "@/lib/server/database";
import {
  getServerEnv,
  isDatabaseConfigured,
  isUpstreamConfigured,
  type ServerEnv
} from "@/lib/server/env";
import { postJsonToUpstream } from "@/lib/server/http";
import type { RequestAuditContext } from "@/lib/server/request-context";

type PartnerInquirySubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function submitPartnerInquiry(
  payload: PartnerInquiryPayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<PartnerInquirySubmitResult> {
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
              insert into app.partner_inquiries (
                full_name,
                company_name,
                role_title,
                email,
                phone,
                company_profile,
                partnership_intent,
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
                $12,
                $13::jsonb
              )
            `,
            [
              payload.fullName,
              payload.companyName,
              payload.role,
              payload.email,
              payload.phone,
              payload.companyProfile || null,
              payload.partnershipIntent,
              payload.source,
              requestContext.requestId,
              requestContext.requestOrigin,
              requestContext.requestIpHash,
              requestContext.userAgent,
              JSON.stringify({
                surface: "partner-inquiry"
              })
            ]
          );
        }
      );

      return { ok: true };
    } catch {
      if (!isUpstreamConfigured(env)) {
        return {
          ok: false,
          reason: "upstream_error"
        };
      }
    }
  }

  if (!isUpstreamConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured"
    };
  }

  try {
    await postJsonToUpstream(
      `${env.upstreamApiBaseUrl}${env.partnerInquirySubmitPath}`,
      payload,
      {
        bearerToken: env.upstreamApiBearerToken!,
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
