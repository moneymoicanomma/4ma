import "server-only";

import type { FighterApplicationPayload } from "@/lib/contracts/fighter-application";
import { getServerEnv, isUpstreamConfigured, type ServerEnv } from "@/lib/server/env";
import { postJsonToUpstream } from "@/lib/server/http";

type FighterApplicationSubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function submitFighterApplication(
  payload: FighterApplicationPayload,
  env: ServerEnv = getServerEnv()
): Promise<FighterApplicationSubmitResult> {
  if (!isUpstreamConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured"
    };
  }

  try {
    await postJsonToUpstream(
      `${env.upstreamApiBaseUrl}${env.fighterApplicationSubmitPath}`,
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
