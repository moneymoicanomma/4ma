import "server-only";

import type { NewsletterSubscriptionPayload } from "@/lib/contracts/newsletter";

import {
  withDatabaseTransaction
} from "@/lib/server/database";
import {
  getServerEnv,
  isDatabaseConfigured,
  isUpstreamConfigured,
  type ServerEnv
} from "@/lib/server/env";
import { postJsonToUpstream } from "@/lib/server/http";
import type { RequestAuditContext } from "@/lib/server/request-context";

type NewsletterSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function subscribeToNewsletter(
  payload: NewsletterSubscriptionPayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<NewsletterSubscribeResult> {
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
              insert into app.newsletter_subscriptions (
                email,
                source,
                request_id,
                request_origin,
                request_ip_hash,
                user_agent,
                metadata
              )
              values ($1, $2, $3, $4, $5, $6, $7::jsonb)
              on conflict (email) do update
              set
                source = excluded.source,
                status = 'subscribed',
                request_id = excluded.request_id,
                request_origin = excluded.request_origin,
                request_ip_hash = excluded.request_ip_hash,
                user_agent = excluded.user_agent,
                metadata = app.newsletter_subscriptions.metadata || excluded.metadata,
                unsubscribed_at = null,
                updated_at = now()
            `,
            [
              payload.email,
              payload.source,
              requestContext.requestId,
              requestContext.requestOrigin,
              requestContext.requestIpHash,
              requestContext.userAgent,
              JSON.stringify({
                surface: "newsletter-signup"
              })
            ]
          );
        }
      );

      return { ok: true };
    } catch (error) {
      console.error("newsletter database insert failed", {
        error,
        email: payload.email,
        requestId: requestContext.requestId
      });

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
      `${env.upstreamApiBaseUrl}${env.newsletterSubscribePath}`,
      payload,
      {
        bearerToken: env.upstreamApiBearerToken!,
        timeoutMs: env.upstreamRequestTimeoutMs
      }
    );

    return { ok: true };
  } catch (error) {
    console.error("newsletter upstream request failed", {
      error,
      email: payload.email,
      requestId: requestContext.requestId
    });

    return {
      ok: false,
      reason: "upstream_error"
    };
  }
}
