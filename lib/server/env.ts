import "server-only";

export type ServerEnv = {
  upstreamApiBaseUrl: string | null;
  upstreamApiBearerToken: string | null;
  newsletterSubscribePath: string;
  fighterApplicationSubmitPath: string;
  partnerInquirySubmitPath: string;
  upstreamRequestTimeoutMs: number;
  allowedFormOrigins: ReadonlySet<string>;
};

function normalizePath(pathname: string, fallback: string) {
  if (!pathname) {
    return fallback;
  }

  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

function createServerEnv(): ServerEnv {
  const timeout = Number.parseInt(process.env.UPSTREAM_REQUEST_TIMEOUT_MS ?? "10000", 10);

  return {
    upstreamApiBaseUrl: process.env.UPSTREAM_API_BASE_URL?.trim().replace(/\/+$/, "") ?? null,
    upstreamApiBearerToken: process.env.UPSTREAM_API_BEARER_TOKEN?.trim() || null,
    newsletterSubscribePath: normalizePath(
      process.env.UPSTREAM_NEWSLETTER_PATH ?? "",
      "/v1/newsletter/subscriptions"
    ),
    fighterApplicationSubmitPath: normalizePath(
      process.env.UPSTREAM_FIGHTER_APPLICATION_PATH ?? "",
      "/v1/fighter-applications"
    ),
    partnerInquirySubmitPath: normalizePath(
      process.env.UPSTREAM_PARTNER_INQUIRY_PATH ?? "",
      "/v1/partner-inquiries"
    ),
    upstreamRequestTimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 10000,
    allowedFormOrigins: new Set(
      (process.env.ALLOWED_FORM_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
  };
}

const serverEnv = createServerEnv();

export function getServerEnv(): ServerEnv {
  return serverEnv;
}

export function isUpstreamConfigured(env: ServerEnv) {
  return Boolean(env.upstreamApiBaseUrl && env.upstreamApiBearerToken);
}
