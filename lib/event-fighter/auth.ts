import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import {
  isValidEventFighterEmail,
  normalizeEventFighterEmail
} from "@/lib/event-fighter/shared";

export const EVENT_FIGHTER_ACCESS_PATH = "/atletas-da-edicao";
export const EVENT_FIGHTER_SESSION_COOKIE_NAME = "mmmma_event_fighter_session";
export const EVENT_FIGHTER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const DEFAULT_EVENT_FIGHTER_PASSWORD = "MONEYMOICANOMMA1";

type EventFighterSessionPayload = {
  v: 1;
  sub: string;
  iat: number;
  exp: number;
  cf: string;
};

export type EventFighterAuthConfig = {
  password: string;
  sessionSecret: string;
};

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function bytesToBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const paddedValue = value + "=".repeat((4 - (value.length % 4 || 4)) % 4);
  const base64 = paddedValue.replace(/-/g, "+").replace(/_/g, "/");

  return Uint8Array.from(Buffer.from(base64, "base64"));
}

function constantTimeEquals(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function normalizeFallbackSecret(password: string) {
  return `event-fighter-session:${password}`;
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function sha256Base64Url(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

export { isValidEventFighterEmail, normalizeEventFighterEmail };

export function getEventFighterAuthConfig(): EventFighterAuthConfig {
  const password =
    normalizeEnvValue(process.env.ATHLETE_FORM_PASSWORD) || DEFAULT_EVENT_FIGHTER_PASSWORD;
  const sessionSecret =
    normalizeEnvValue(process.env.ATHLETE_FORM_SESSION_SECRET) ||
    normalizeEnvValue(process.env.ADMIN_SESSION_SECRET) ||
    normalizeFallbackSecret(password);

  return {
    password,
    sessionSecret
  };
}

export function createEventFighterSessionFingerprint(email: string, sessionSecret: string) {
  return sha256Base64Url(`${normalizeEventFighterEmail(email)}:${sessionSecret}`);
}

export function createEventFighterSessionToken(
  email: string,
  secret: string,
  sessionFingerprint: string,
  issuedAtMs = Date.now()
) {
  const issuedAtSeconds = Math.floor(issuedAtMs / 1000);
  const payload: EventFighterSessionPayload = {
    v: 1,
    sub: normalizeEventFighterEmail(email),
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + EVENT_FIGHTER_SESSION_MAX_AGE_SECONDS,
    cf: sessionFingerprint
  };

  const encodedPayload = bytesToBase64Url(
    Uint8Array.from(Buffer.from(JSON.stringify(payload), "utf-8"))
  );
  const signature = signValue(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export function verifyEventFighterSessionToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload, secret);

  if (!constantTimeEquals(base64UrlToBytes(signature), base64UrlToBytes(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(base64UrlToBytes(encodedPayload)).toString("utf-8")
    ) as Partial<EventFighterSessionPayload>;

    if (
      payload.v !== 1 ||
      typeof payload.sub !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      typeof payload.cf !== "string"
    ) {
      return null;
    }

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload as EventFighterSessionPayload;
  } catch {
    return null;
  }
}

export function getSafeEventFighterRedirectPath(
  value: string | null | undefined,
  fallback = EVENT_FIGHTER_ACCESS_PATH
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
