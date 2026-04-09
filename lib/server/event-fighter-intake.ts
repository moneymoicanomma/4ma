import "server-only";

import {
  buildEventFighterIntakeUpstreamFormData,
  type EventFighterIntakeSubmission
} from "@/lib/contracts/event-fighter-intake";
import { getServerEnv, isUpstreamConfigured, type ServerEnv } from "@/lib/server/env";
import { postFormDataToUpstream } from "@/lib/server/http";

type EventFighterIntakeSubmitResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "upstream_error";
    };

export async function submitEventFighterIntake(
  submission: EventFighterIntakeSubmission,
  env: ServerEnv = getServerEnv()
): Promise<EventFighterIntakeSubmitResult> {
  if (!isUpstreamConfigured(env)) {
    return {
      ok: false,
      reason: "not_configured"
    };
  }

  try {
    await postFormDataToUpstream(
      `${env.upstreamApiBaseUrl}${env.eventFighterIntakeSubmitPath}`,
      buildEventFighterIntakeUpstreamFormData(submission),
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
