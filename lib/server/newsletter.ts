import "server-only";

import type { NewsletterSubscriptionPayload } from "@/lib/contracts/newsletter";

import { getServerEnv, isUpstreamConfigured, type ServerEnv } from "@/lib/server/env";
import { postJsonToUpstream } from "@/lib/server/http";

type NewsletterSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function subscribeToNewsletter(
  payload: NewsletterSubscriptionPayload,
  env: ServerEnv = getServerEnv()
): Promise<NewsletterSubscribeResult> {
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
  } catch {
    return {
      ok: false,
      reason: "upstream_error"
    };
  }
}
