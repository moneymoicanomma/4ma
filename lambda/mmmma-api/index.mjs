import { createHash, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(scryptCallback);

const EVENT_FIGHTER_ACCESS_PATH = "/v1/event-fighter-access/session";
const HEALTHCHECK_PATH = "/health";
const PASSWORD_HASH_PREFIX = "scrypt";
const DATABASE_CONNECTION_TIMEOUT_MS = 5000;
const DATABASE_QUERY_TIMEOUT_MS = 10000;

let pool;

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

function getDatabasePool() {
  if (!pool) {
    const databaseUrl = getRequiredEnv("DATABASE_URL");
    const sslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase() ?? "require";

    pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
      query_timeout: DATABASE_QUERY_TIMEOUT_MS,
      statement_timeout: DATABASE_QUERY_TIMEOUT_MS,
      max: 4,
      ssl:
        sslMode === "disable"
          ? undefined
          : {
              rejectUnauthorized: false
            }
    });
  }

  return pool;
}

function buildJsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "cache-control": "no-store, max-age=0",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

function getHeader(headers, headerName) {
  if (!headers) {
    return null;
  }

  const target = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }

  return null;
}

function assertInternalBearer(event) {
  const expectedToken = getRequiredEnv("INTERNAL_API_BEARER_TOKEN");
  const authorization = getHeader(event.headers, "authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme !== "Bearer" || token !== expectedToken) {
    return false;
  }

  return true;
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function parseJsonBody(event) {
  if (!event.body) {
    return null;
  }

  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf-8")
    : event.body;

  return JSON.parse(rawBody);
}

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest();
}

function safeCompare(left, right) {
  return timingSafeEqual(sha256Buffer(left), sha256Buffer(right));
}

async function verifyPasswordHash(password, passwordHash) {
  if (!passwordHash) {
    return false;
  }

  const [prefix, saltValue, keyValue] = passwordHash.split("$");

  if (prefix !== PASSWORD_HASH_PREFIX || !saltValue || !keyValue) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const storedKey = Buffer.from(keyValue, "base64url");
  const derivedKey = await scrypt(password, salt, storedKey.length);

  return timingSafeEqual(storedKey, Buffer.from(derivedKey));
}

async function handleEventFighterAccess(event) {
  if (!assertInternalBearer(event)) {
    return buildJsonResponse(401, {
      ok: false,
      message: "Unauthorized."
    });
  }

  let body;

  try {
    body = parseJsonBody(event);
  } catch {
    return buildJsonResponse(400, {
      ok: false,
      message: "Invalid JSON body."
    });
  }

  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const next =
    typeof body?.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//")
      ? body.next
      : "/atletas-da-edicao";

  if (!email || !password) {
    return buildJsonResponse(400, {
      ok: false,
      message: "Informe email e senha."
    });
  }

  const pool = getDatabasePool();
  const result = await pool.query(
    `
      select
        id,
        email,
        password_hash as "passwordHash",
        role,
        status
      from app.accounts
      where email = $1
        and role = 'fighter'
      limit 1
    `,
    [email]
  );

  const account = result.rows[0] ?? null;

  if (!account || account.status !== "active") {
    return buildJsonResponse(401, {
      ok: false,
      message: "Credenciais inválidas."
    });
  }

  const isValidPassword = await verifyPasswordHash(password, account.passwordHash);

  if (!isValidPassword) {
    return buildJsonResponse(401, {
      ok: false,
      message: "Credenciais inválidas."
    });
  }

  return buildJsonResponse(200, {
    ok: true,
    message: "Acesso liberado.",
    redirectTo: next
  });
}

function buildHealthResponse() {
  return buildJsonResponse(200, {
    ok: true,
    message: "Lambda online."
  });
}

function buildNotFoundResponse() {
  return buildJsonResponse(404, {
    ok: false,
    message: "Route not found."
  });
}

function buildMethodNotAllowedResponse() {
  return {
    statusCode: 405,
    headers: {
      allow: "POST, GET",
      "cache-control": "no-store, max-age=0",
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      ok: false,
      message: "Method not allowed."
    })
  };
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method ?? "GET";
  const rawPath = event?.rawPath ?? "/";

  try {
    if (method === "GET" && rawPath === HEALTHCHECK_PATH) {
      return buildHealthResponse();
    }

    if (method === "POST" && rawPath === EVENT_FIGHTER_ACCESS_PATH) {
      return await handleEventFighterAccess(event);
    }

    if (method !== "GET" && method !== "POST") {
      return buildMethodNotAllowedResponse();
    }

    return buildNotFoundResponse();
  } catch (error) {
    console.error("lambda handler failed", {
      error,
      method,
      rawPath
    });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
};
