import "server-only";

import type { NewsletterSubscriptionPayload } from "@/lib/contracts/newsletter";

import { getServerEnv, isUpstreamConfigured } from "@/lib/server/env";
import { postJsonToUpstream, UpstreamApiError } from "@/lib/server/http";

type NewsletterSubscribeResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
      status?: number;
    };

export async function subscribeToNewsletter(
  payload: NewsletterSubscriptionPayload
): Promise<NewsletterSubscribeResult> {
  const env = getServerEnv();

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
    const status = error instanceof UpstreamApiError ? error.status : 502;

    return {
      ok: false,
      reason: "upstream_error",
      status
    };
  }
}
