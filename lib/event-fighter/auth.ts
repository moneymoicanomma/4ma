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

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const paddedValue = value + "=".repeat((4 - (value.length % 4 || 4)) % 4);
  const base64 = paddedValue.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function constantTimeEquals(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

function normalizeFallbackSecret(password: string) {
  return `event-fighter-session:${password}`;
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );
}

async function signValue(value: string, secret: string) {
  const key = await importHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));

  return bytesToBase64Url(new Uint8Array(signatureBuffer));
}

async function sha256Base64Url(value: string) {
  const digestBuffer = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));

  return bytesToBase64Url(new Uint8Array(digestBuffer));
}

export function normalizeEventFighterEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEventFighterEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getEventFighterAuthConfig(): EventFighterAuthConfig {
  const password = normalizeEnvValue(process.env.ATHLETE_FORM_PASSWORD) || DEFAULT_EVENT_FIGHTER_PASSWORD;
  const sessionSecret =
    normalizeEnvValue(process.env.ATHLETE_FORM_SESSION_SECRET) ||
    normalizeEnvValue(process.env.ADMIN_SESSION_SECRET) ||
    normalizeFallbackSecret(password);

  return {
    password,
    sessionSecret
  };
}

export async function createEventFighterCredentialFingerprint(email: string, password: string) {
  return sha256Base64Url(`${normalizeEventFighterEmail(email)}:${password}`);
}

export async function createEventFighterSessionToken(
  email: string,
  secret: string,
  credentialFingerprint: string,
  issuedAtMs = Date.now()
) {
  const issuedAtSeconds = Math.floor(issuedAtMs / 1000);
  const payload: EventFighterSessionPayload = {
    v: 1,
    sub: normalizeEventFighterEmail(email),
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + EVENT_FIGHTER_SESSION_MAX_AGE_SECONDS,
    cf: credentialFingerprint
  };

  const encodedPayload = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyEventFighterSessionToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await signValue(encodedPayload, secret);

  if (
    !constantTimeEquals(base64UrlToBytes(signature), base64UrlToBytes(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      textDecoder.decode(base64UrlToBytes(encodedPayload))
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
