import "server-only";

import type { PartnerInquiryPayload } from "@/lib/contracts/partner-inquiry";
import { getServerEnv, isUpstreamConfigured, type ServerEnv } from "@/lib/server/env";
import { postJsonToUpstream } from "@/lib/server/http";

type PartnerInquirySubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function submitPartnerInquiry(
  payload: PartnerInquiryPayload,
  env: ServerEnv = getServerEnv()
): Promise<PartnerInquirySubmitResult> {
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
