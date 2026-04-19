import "server-only";

export type ServerEnv = {
  databaseUrl: string | null;
  databasePoolMaxConnections: number;
  databaseSslMode: "disable" | "require";
  databaseSslAllowInvalidCertificates: boolean;
  appEncryptionKey: string | null;
  eventFighterPortalEnabled: boolean;
  eventFighterAccessAuthMode: "account" | "shared_password";
  turnstileSecretKey: string | null;
  turnstileSiteKey: string | null;
  fighterPhotosStorageProvider: string;
  fighterPhotosStorageBucket: string | null;
  fighterPhotosStorageRegion: string;
  fighterPhotosStorageEndpoint: string | null;
  fighterPhotosStorageAccessKeyId: string | null;
  fighterPhotosStorageSecretAccessKey: string | null;
  fighterPhotosStorageForcePathStyle: boolean;
  upstreamApiBaseUrl: string | null;
  upstreamApiLegacyBearerToken: string | null;
  upstreamPublicWriteBearerToken: string | null;
  upstreamPortalBearerToken: string | null;
  upstreamAdminReadBearerToken: string | null;
  upstreamAdminWriteBearerToken: string | null;
  eventFighterAccessPath: string;
  adminDatabaseOverviewPath: string;
  fantasyEventsPath: string;
  adminFantasyEventsPath: string;
  newsletterSubscribePath: string;
  contactMessageSubmitPath: string;
  fighterApplicationSubmitPath: string;
  eventFighterIntakeSubmitPath: string;
  partnerInquirySubmitPath: string;
  fantasyEntrySubmitPath: string;
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
  const poolMaxConnections = Number.parseInt(process.env.DATABASE_POOL_MAX_CONNECTIONS ?? "10", 10);
  const databaseSslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();
  const databaseSslAllowInvalidCertificates =
    process.env.DATABASE_SSL_ALLOW_INVALID_CERTIFICATES?.trim().toLowerCase() === "true";
  const eventFighterPortalEnabled =
    process.env.EVENT_FIGHTER_PORTAL_ENABLED?.trim().toLowerCase() === "true";
  const eventFighterAccessAuthMode =
    process.env.EVENT_FIGHTER_ACCESS_AUTH_MODE?.trim().toLowerCase() === "shared_password"
      ? "shared_password"
      : "account";
  const fighterPhotosStorageForcePathStyle =
    process.env.FIGHTER_PHOTOS_S3_FORCE_PATH_STYLE?.trim().toLowerCase() === "true";

  return {
    databaseUrl: process.env.DATABASE_URL?.trim() || null,
    databasePoolMaxConnections:
      Number.isFinite(poolMaxConnections) && poolMaxConnections > 0 ? poolMaxConnections : 10,
    databaseSslMode: databaseSslMode === "disable" ? "disable" : "require",
    databaseSslAllowInvalidCertificates,
    appEncryptionKey: process.env.APP_ENCRYPTION_KEY?.trim() || null,
    eventFighterPortalEnabled,
    eventFighterAccessAuthMode,
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY?.trim() || null,
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null,
    fighterPhotosStorageProvider: process.env.FIGHTER_PHOTOS_STORAGE_PROVIDER?.trim() || "s3",
    fighterPhotosStorageBucket: process.env.FIGHTER_PHOTOS_S3_BUCKET?.trim() || null,
    fighterPhotosStorageRegion: process.env.FIGHTER_PHOTOS_S3_REGION?.trim() || "us-east-1",
    fighterPhotosStorageEndpoint: process.env.FIGHTER_PHOTOS_S3_ENDPOINT?.trim() || null,
    fighterPhotosStorageAccessKeyId:
      process.env.FIGHTER_PHOTOS_S3_ACCESS_KEY_ID?.trim() || null,
    fighterPhotosStorageSecretAccessKey:
      process.env.FIGHTER_PHOTOS_S3_SECRET_ACCESS_KEY?.trim() || null,
    fighterPhotosStorageForcePathStyle,
    upstreamApiBaseUrl: process.env.UPSTREAM_API_BASE_URL?.trim().replace(/\/+$/, "") ?? null,
    upstreamApiLegacyBearerToken: process.env.UPSTREAM_API_BEARER_TOKEN?.trim() || null,
    upstreamPublicWriteBearerToken:
      process.env.UPSTREAM_PUBLIC_WRITE_BEARER_TOKEN?.trim() || null,
    upstreamPortalBearerToken: process.env.UPSTREAM_PORTAL_BEARER_TOKEN?.trim() || null,
    upstreamAdminReadBearerToken:
      process.env.UPSTREAM_ADMIN_READ_BEARER_TOKEN?.trim() || null,
    upstreamAdminWriteBearerToken:
      process.env.UPSTREAM_ADMIN_WRITE_BEARER_TOKEN?.trim() || null,
    eventFighterAccessPath: normalizePath(
      process.env.UPSTREAM_EVENT_FIGHTER_ACCESS_PATH ?? "",
      "/v1/event-fighter-access/session"
    ),
    adminDatabaseOverviewPath: normalizePath(
      process.env.UPSTREAM_ADMIN_DATABASE_OVERVIEW_PATH ?? "",
      "/v1/admin/database-overview"
    ),
    fantasyEventsPath: normalizePath(
      process.env.UPSTREAM_FANTASY_EVENTS_PATH ?? "",
      "/v1/fantasy/events"
    ),
    adminFantasyEventsPath: normalizePath(
      process.env.UPSTREAM_ADMIN_FANTASY_EVENTS_PATH ?? "",
      "/v1/admin/fantasy/events"
    ),
    newsletterSubscribePath: normalizePath(
      process.env.UPSTREAM_NEWSLETTER_PATH ?? "",
      "/v1/newsletter/subscriptions"
    ),
    contactMessageSubmitPath: normalizePath(
      process.env.UPSTREAM_CONTACT_MESSAGE_PATH ?? "",
      "/v1/contact-messages"
    ),
    fighterApplicationSubmitPath: normalizePath(
      process.env.UPSTREAM_FIGHTER_APPLICATION_PATH ?? "",
      "/v1/fighter-applications"
    ),
    eventFighterIntakeSubmitPath: normalizePath(
      process.env.UPSTREAM_EVENT_FIGHTER_INTAKE_PATH ?? "",
      "/v1/event-fighter-intakes"
    ),
    partnerInquirySubmitPath: normalizePath(
      process.env.UPSTREAM_PARTNER_INQUIRY_PATH ?? "",
      "/v1/partner-inquiries"
    ),
    fantasyEntrySubmitPath: normalizePath(
      process.env.UPSTREAM_FANTASY_ENTRY_PATH ?? "",
      "/v1/fantasy/entries"
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

export function isDatabaseConfigured(env: ServerEnv) {
  const databaseUrl = env.databaseUrl;

  if (!databaseUrl) {
    return false;
  }

  try {
    const protocol = new URL(databaseUrl).protocol.toLowerCase();

    return protocol === "postgres:" || protocol === "postgresql:";
  } catch {
    return false;
  }
}

export function isEventFighterPortalEnabled(env: ServerEnv) {
  return env.eventFighterPortalEnabled;
}

export function isTurnstileConfigured(env: ServerEnv) {
  return Boolean(env.turnstileSecretKey && env.turnstileSiteKey);
}

export function isFighterPhotoStorageConfigured(env: ServerEnv) {
  return Boolean(
    env.fighterPhotosStorageBucket &&
      env.fighterPhotosStorageAccessKeyId &&
      env.fighterPhotosStorageSecretAccessKey
  );
}

function resolveUpstreamBearerToken(
  env: ServerEnv,
  token: string | null
) {
  return token || env.upstreamApiLegacyBearerToken;
}

export function getPublicWriteUpstreamBearerToken(env: ServerEnv) {
  return resolveUpstreamBearerToken(env, env.upstreamPublicWriteBearerToken);
}

export function getPortalUpstreamBearerToken(env: ServerEnv) {
  return resolveUpstreamBearerToken(env, env.upstreamPortalBearerToken);
}

export function getAdminReadUpstreamBearerToken(env: ServerEnv) {
  return resolveUpstreamBearerToken(env, env.upstreamAdminReadBearerToken);
}

export function getAdminWriteUpstreamBearerToken(env: ServerEnv) {
  return resolveUpstreamBearerToken(env, env.upstreamAdminWriteBearerToken);
}

export function isPublicUpstreamConfigured(env: ServerEnv) {
  return Boolean(env.upstreamApiBaseUrl && getPublicWriteUpstreamBearerToken(env));
}

export function isPortalUpstreamConfigured(env: ServerEnv) {
  return Boolean(env.upstreamApiBaseUrl && getPortalUpstreamBearerToken(env));
}

export function isAdminReadUpstreamConfigured(env: ServerEnv) {
  return Boolean(env.upstreamApiBaseUrl && getAdminReadUpstreamBearerToken(env));
}

export function isAdminWriteUpstreamConfigured(env: ServerEnv) {
  return Boolean(env.upstreamApiBaseUrl && getAdminWriteUpstreamBearerToken(env));
}

export function isUpstreamConfigured(env: ServerEnv) {
  return Boolean(
    env.upstreamApiBaseUrl &&
      (
        getPublicWriteUpstreamBearerToken(env) ||
        getPortalUpstreamBearerToken(env) ||
        getAdminReadUpstreamBearerToken(env) ||
        getAdminWriteUpstreamBearerToken(env)
      )
  );
}
