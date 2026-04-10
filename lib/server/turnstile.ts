import "server-only";

import { getServerEnv, isTurnstileConfigured, type ServerEnv } from "@/lib/server/env";

type TurnstileVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_token" | "verification_failed" | "not_configured";
      errorCodes?: string[];
    };

type TurnstileVerifyResponse = {
  success?: boolean;
  "error-codes"?: string[];
};

export async function verifyTurnstileToken(
  token: string,
  options: {
    clientIp?: string | null;
    requestId?: string | null;
  },
  env: ServerEnv = getServerEnv()
): Promise<TurnstileVerifyResult> {
  if (!isTurnstileConfigured(env)) {
    return { ok: false, reason: "not_configured" };
  }

  if (!token.trim()) {
    return { ok: false, reason: "missing_token" };
  }

  const payload = new URLSearchParams({
    secret: env.turnstileSecretKey!,
    response: token.trim()
  });

  if (options.clientIp) {
    payload.set("remoteip", options.clientIp);
  }

  if (options.requestId) {
    payload.set("idempotency_key", options.requestId);
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload.toString(),
      cache: "no-store"
    });

    const result = (await response.json().catch(() => null)) as TurnstileVerifyResponse | null;

    if (response.ok && result?.success) {
      return { ok: true };
    }

    return {
      ok: false,
      reason: "verification_failed",
      errorCodes: result?.["error-codes"] ?? []
    };
  } catch {
    return {
      ok: false,
      reason: "verification_failed"
    };
  }
}
