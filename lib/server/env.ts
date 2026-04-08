import "server-only";

export type ServerEnv = {
  upstreamApiBaseUrl: string | null;
  upstreamApiBearerToken: string | null;
  newsletterSubscribePath: string;
  upstreamRequestTimeoutMs: number;
  allowedFormOrigins: string[];
};

function normalizePath(pathname: string) {
  if (!pathname) {
    return "/v1/newsletter/subscriptions";
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export function getServerEnv(): ServerEnv {
  const timeout = Number.parseInt(process.env.UPSTREAM_REQUEST_TIMEOUT_MS ?? "10000", 10);

  return {
    upstreamApiBaseUrl: process.env.UPSTREAM_API_BASE_URL?.trim().replace(/\/+$/, "") ?? null,
    upstreamApiBearerToken: process.env.UPSTREAM_API_BEARER_TOKEN?.trim() || null,
    newsletterSubscribePath: normalizePath(process.env.UPSTREAM_NEWSLETTER_PATH ?? ""),
    upstreamRequestTimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 10000,
    allowedFormOrigins: (process.env.ALLOWED_FORM_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  };
}

export function isUpstreamConfigured(env: ServerEnv) {
  return Boolean(env.upstreamApiBaseUrl && env.upstreamApiBearerToken);
}
