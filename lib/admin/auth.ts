export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_DEFAULT_REDIRECT_PATH = "/admin/fantasy";
export const ADMIN_SESSION_COOKIE_NAME = "mmmma_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type AdminAuthRole = "admin" | "operator" | "auditor";

type AdminSessionPayloadV1 = {
  v: 1;
  sub: string;
  iat: number;
  exp: number;
  cf: string;
};

type AdminSessionPayloadV2 = {
  v: 2;
  sub: string;
  iat: number;
  exp: number;
  cf: string;
  rl: AdminAuthRole;
};

type VerifiedAdminSessionPayload = {
  sub: string;
  iat: number;
  exp: number;
  cf: string;
  role: AdminAuthRole;
};

export type AdminAuthCredential = {
  username: string;
  password: string;
  role: AdminAuthRole;
};

export type AdminAuthConfig = {
  credentials: AdminAuthCredential[];
  sessionSecret: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeIdentifierForMatch(value: string) {
  return normalizeEnvValue(value).toLowerCase();
}

function normalizeAdminRole(value: unknown): AdminAuthRole {
  if (typeof value !== "string") {
    return "admin";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (normalizedValue === "auditor" || normalizedValue === "operator") {
    return normalizedValue;
  }

  return "admin";
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

function appendAdminCredential(
  credentials: AdminAuthCredential[],
  seenNormalizedIdentifiers: Set<string>,
  credential: AdminAuthCredential | null,
) {
  if (!credential) {
    return;
  }

  const normalizedIdentifier = normalizeIdentifierForMatch(credential.username);

  if (!normalizedIdentifier || seenNormalizedIdentifiers.has(normalizedIdentifier)) {
    return;
  }

  credentials.push(credential);
  seenNormalizedIdentifiers.add(normalizedIdentifier);
}

function parseAdminCredentialsJson(): AdminAuthCredential[] {
  const rawValue = normalizeEnvValue(process.env.ADMIN_CREDENTIALS_JSON);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    const parsedCredentials: AdminAuthCredential[] = [];

    for (const item of parsedValue) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const entry = item as Record<string, unknown>;
      const username = normalizeEnvValue(
        typeof entry.username === "string" ? entry.username : undefined,
      );
      const password = typeof entry.password === "string" ? entry.password : "";

      if (!username || !password) {
        continue;
      }

      parsedCredentials.push({
        username,
        password,
        role: normalizeAdminRole(entry.role),
      });
    }

    return parsedCredentials;
  } catch {
    return [];
  }
}

export function getAdminAuthConfig(): AdminAuthConfig | null {
  const sessionSecret = normalizeEnvValue(process.env.ADMIN_SESSION_SECRET);
  const credentials: AdminAuthCredential[] = [];
  const seenNormalizedIdentifiers = new Set<string>();

  appendAdminCredential(credentials, seenNormalizedIdentifiers, {
    username: normalizeEnvValue(process.env.ADMIN_USERNAME),
    password: process.env.ADMIN_PASSWORD ?? "",
    role: "admin",
  });
  appendAdminCredential(credentials, seenNormalizedIdentifiers, {
    username: normalizeEnvValue(process.env.ADMIN_OPERATOR_USERNAME),
    password: process.env.ADMIN_OPERATOR_PASSWORD ?? "",
    role: "operator",
  });
  appendAdminCredential(credentials, seenNormalizedIdentifiers, {
    username: normalizeEnvValue(process.env.ADMIN_AUDITOR_USERNAME),
    password: process.env.ADMIN_AUDITOR_PASSWORD ?? "",
    role: "auditor",
  });

  for (const credential of parseAdminCredentialsJson()) {
    appendAdminCredential(credentials, seenNormalizedIdentifiers, credential);
  }

  if (!sessionSecret || !credentials.length) {
    return null;
  }

  return {
    credentials,
    sessionSecret
  };
}

export function isAdminAuthConfigured(config: AdminAuthConfig | null = getAdminAuthConfig()) {
  return Boolean(config);
}

export async function createAdminCredentialFingerprint(username: string, password: string) {
  return sha256Base64Url(`${username}:${password}`);
}

export async function createAdminSessionToken(
  username: string,
  role: AdminAuthRole,
  secret: string,
  credentialFingerprint: string,
  issuedAtMs = Date.now()
) {
  const issuedAtSeconds = Math.floor(issuedAtMs / 1000);
  const payload: AdminSessionPayloadV2 = {
    v: 2,
    sub: username,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + ADMIN_SESSION_MAX_AGE_SECONDS,
    cf: credentialFingerprint,
    rl: role,
  };

  const encodedPayload = bytesToBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const signature = await signValue(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSessionToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  let expectedSignature: string;

  try {
    expectedSignature = await signValue(encodedPayload, secret);
  } catch {
    return null;
  }

  try {
    if (
      !constantTimeEquals(base64UrlToBytes(signature), base64UrlToBytes(expectedSignature))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(
      textDecoder.decode(base64UrlToBytes(encodedPayload))
    ) as Record<string, unknown>;
    const payloadVersion = payload.v;

    if (payloadVersion === 1) {
      const sub = payload.sub;
      const iat = payload.iat;
      const exp = payload.exp;
      const cf = payload.cf;

      if (
        typeof sub !== "string" ||
        typeof iat !== "number" ||
        typeof exp !== "number" ||
        typeof cf !== "string"
      ) {
        return null;
      }

      if (exp <= Math.floor(Date.now() / 1000)) {
        return null;
      }

      return {
        sub,
        iat,
        exp,
        cf,
        role: "admin",
      } satisfies VerifiedAdminSessionPayload;
    }

    const sub = payload.sub;
    const iat = payload.iat;
    const exp = payload.exp;
    const cf = payload.cf;
    const role = payload.rl;

    if (
      payloadVersion !== 2 ||
      typeof sub !== "string" ||
      typeof iat !== "number" ||
      typeof exp !== "number" ||
      typeof cf !== "string" ||
      (role !== "admin" && role !== "operator" && role !== "auditor")
    ) {
      return null;
    }

    if (exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      sub,
      iat,
      exp,
      cf,
      role,
    } satisfies VerifiedAdminSessionPayload;
  } catch {
    return null;
  }
}

export async function resolveAdminSessionIdentity(token: string) {
  const config = getAdminAuthConfig();

  if (!config) {
    return null;
  }

  const session = await verifyAdminSessionToken(token, config.sessionSecret);

  if (!session) {
    return null;
  }

  for (const credential of config.credentials) {
    if (
      normalizeIdentifierForMatch(session.sub) !==
      normalizeIdentifierForMatch(credential.username)
    ) {
      continue;
    }

    const credentialFingerprint = await createAdminCredentialFingerprint(
      credential.username,
      credential.password
    );

    if (session.cf !== credentialFingerprint || session.role !== credential.role) {
      continue;
    }

    return {
      username: credential.username,
      role: credential.role,
    };
  }

  return null;
}

export function getSafeAdminRedirectPath(
  value: string | null | undefined,
  fallback = ADMIN_DEFAULT_REDIRECT_PATH
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
