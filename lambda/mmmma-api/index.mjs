import {
  createHash,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(scryptCallback);

const EVENT_FIGHTER_ACCESS_PATH = "/v1/event-fighter-access/session";
const EVENT_FIGHTER_INTAKE_PATH = "/v1/event-fighter-intakes";
const NEWSLETTER_SUBSCRIBE_PATH = "/v1/newsletter/subscriptions";
const CONTACT_MESSAGES_PATH = "/v1/contact-messages";
const FIGHTER_APPLICATIONS_PATH = "/v1/fighter-applications";
const PARTNER_INQUIRIES_PATH = "/v1/partner-inquiries";
const FANTASY_ENTRIES_PATH = "/v1/fantasy/entries";
const HEALTHCHECK_PATH = "/health";
const PASSWORD_HASH_PREFIX = "scrypt";
const DATABASE_CONNECTION_TIMEOUT_MS = 5000;
const DATABASE_QUERY_TIMEOUT_MS = 10000;
const EVENT_FIGHTER_INTAKE_SOURCE = "money-moicano-atletas-da-edicao";
const PRESS_NEWSLETTER_SOURCE = "money-moicano-imprensa";
const EVENT_FIGHTER_PHOTO_FIELDS = [
  "fullBodyPhoto",
  "facePhoto",
  "frontPhoto",
  "profilePhoto",
  "diagonalLeftPhoto",
  "diagonalRightPhoto"
];
const EVENT_FIGHTER_PHOTO_FIELD_TO_DB = {
  fullBodyPhoto: "full_body_photo",
  facePhoto: "face_photo",
  frontPhoto: "front_photo",
  profilePhoto: "profile_photo",
  diagonalLeftPhoto: "diagonal_left_photo",
  diagonalRightPhoto: "diagonal_right_photo"
};
const BRAZILIAN_STATES = [
  { code: "AC", name: "Acre" },
  { code: "AL", name: "Alagoas" },
  { code: "AP", name: "Amapá" },
  { code: "AM", name: "Amazonas" },
  { code: "BA", name: "Bahia" },
  { code: "CE", name: "Ceará" },
  { code: "DF", name: "Distrito Federal" },
  { code: "ES", name: "Espírito Santo" },
  { code: "GO", name: "Goiás" },
  { code: "MA", name: "Maranhão" },
  { code: "MT", name: "Mato Grosso" },
  { code: "MS", name: "Mato Grosso do Sul" },
  { code: "MG", name: "Minas Gerais" },
  { code: "PA", name: "Pará" },
  { code: "PB", name: "Paraíba" },
  { code: "PR", name: "Paraná" },
  { code: "PE", name: "Pernambuco" },
  { code: "PI", name: "Piauí" },
  { code: "RJ", name: "Rio de Janeiro" },
  { code: "RN", name: "Rio Grande do Norte" },
  { code: "RS", name: "Rio Grande do Sul" },
  { code: "RO", name: "Rondônia" },
  { code: "RR", name: "Roraima" },
  { code: "SC", name: "Santa Catarina" },
  { code: "SP", name: "São Paulo" },
  { code: "SE", name: "Sergipe" },
  { code: "TO", name: "Tocantins" }
];

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

function normalizeNameForMatch(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function toDatabaseEventPhotoFieldName(fieldName) {
  return EVENT_FIGHTER_PHOTO_FIELD_TO_DB[fieldName] ?? fieldName;
}

function buildSerializableRequestContext(input, actorEmail = null) {
  return {
    actorId: null,
    actorRole: "public",
    actorEmail,
    requestId: normalizeText(input?.requestId) || randomUUID(),
    clientIp: normalizeNullableText(input?.clientIp),
    origin: normalizeNullableText(input?.requestOrigin),
    userAgent: normalizeNullableText(input?.userAgent),
    requestIpHash: normalizeNullableText(input?.requestIpHash)
  };
}

function getPayloadBody(body) {
  if (!body || typeof body !== "object") {
    return null;
  }

  return body.payload && typeof body.payload === "object" ? body.payload : body;
}

function getRequestContextBody(body) {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body.requestContext && typeof body.requestContext === "object"
    ? body.requestContext
    : {};
}

const stateNameToCode = new Map(
  BRAZILIAN_STATES.map((state) => [normalizeNameForMatch(state.name), state.code])
);

function getBrazilianStateCode(value) {
  const normalized = normalizeNameForMatch(value);

  if (!normalized) {
    return null;
  }

  return stateNameToCode.get(normalized) ?? null;
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

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
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

async function applyRequestContext(client, context) {
  await client.query(
    `
      select app.set_request_context(
        $1::uuid,
        $2::text,
        $3::text,
        $4::uuid,
        $5::text,
        $6::inet,
        $7::text,
        $8::text
      )
    `,
    [
      context.actorId ?? null,
      context.actorRole ?? null,
      context.actorEmail ?? null,
      context.fantasyEntryId ?? null,
      context.requestId ?? randomUUID(),
      context.clientIp ?? null,
      context.origin ?? null,
      context.userAgent ?? null
    ]
  );
}

async function applyEncryptionKeyIfNeeded(client) {
  const encryptionKey = getRequiredEnv("APP_ENCRYPTION_KEY");
  await client.query("select set_config('app.encryption_key', $1, true)", [encryptionKey]);
}

async function withDatabaseTransaction(context, execute, options = {}) {
  const client = await getDatabasePool().connect();

  try {
    await client.query("BEGIN");
    await applyRequestContext(client, context);

    if (options.requiresEncryptionKey) {
      await applyEncryptionKeyIfNeeded(client);
    }

    const result = await execute(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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

  const result = await getDatabasePool().query(
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

async function handleNewsletterSubscribe(event) {
  if (!assertInternalBearer(event)) {
    return buildJsonResponse(401, { ok: false, message: "Unauthorized." });
  }

  let body;

  try {
    body = parseJsonBody(event);
  } catch {
    return buildJsonResponse(400, { ok: false, message: "Invalid JSON body." });
  }

  const payload = getPayloadBody(body);
  const email = normalizeEmail(payload?.email);
  const source = normalizeText(payload?.source) || "money-moicano-landing";
  const name = normalizeText(payload?.name);
  const requestContext = buildSerializableRequestContext(getRequestContextBody(body), email);
  const metadata = {
    surface: source === PRESS_NEWSLETTER_SOURCE ? "press-newsletter" : "newsletter-signup",
    ...(name ? { fullName: name } : {})
  };

  if (!email) {
    return buildJsonResponse(400, {
      ok: false,
      message: "Informe um e-mail valido."
    });
  }

  try {
    await withDatabaseTransaction(requestContext, async (client) => {
      await client.query(
        `
          insert into app.newsletter_subscriptions (
            email,
            source,
            request_id,
            request_origin,
            request_ip_hash,
            user_agent,
            metadata
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb)
          on conflict (email) do update
          set
            source = excluded.source,
            status = 'subscribed',
            request_id = excluded.request_id,
            request_origin = excluded.request_origin,
            request_ip_hash = excluded.request_ip_hash,
            user_agent = excluded.user_agent,
            metadata = app.newsletter_subscriptions.metadata || excluded.metadata,
            unsubscribed_at = null,
            updated_at = now()
        `,
        [
          email,
          source,
          requestContext.requestId,
          requestContext.origin,
          requestContext.requestIpHash,
          requestContext.userAgent,
          JSON.stringify(metadata)
        ]
      );
    });

    return buildJsonResponse(200, { ok: true });
  } catch (error) {
    console.error("newsletter subscribe failed", { error, email, source });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handleContactMessages(event) {
  if (!assertInternalBearer(event)) {
    return buildJsonResponse(401, { ok: false, message: "Unauthorized." });
  }

  let body;

  try {
    body = parseJsonBody(event);
  } catch {
    return buildJsonResponse(400, { ok: false, message: "Invalid JSON body." });
  }

  const payload = getPayloadBody(body);
  const email = normalizeEmail(payload?.email);
  const requestContext = buildSerializableRequestContext(getRequestContextBody(body), email);

  try {
    await withDatabaseTransaction(requestContext, async (client) => {
      await client.query(
        `
          insert into app.contact_messages (
            recipient_email,
            full_name,
            email,
            subject,
            message,
            source,
            request_id,
            request_origin,
            request_ip_hash,
            user_agent,
            metadata
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11::jsonb
          )
        `,
        [
          normalizeEmail(payload?.recipientEmail),
          normalizeText(payload?.fullName),
          email,
          normalizeText(payload?.subject),
          normalizeText(payload?.message),
          normalizeText(payload?.source),
          requestContext.requestId,
          requestContext.origin,
          requestContext.requestIpHash,
          requestContext.userAgent,
          JSON.stringify({ surface: "contact-page" })
        ]
      );
    });

    return buildJsonResponse(200, { ok: true });
  } catch (error) {
    console.error("contact message failed", {
      error,
      email,
      subject: normalizeText(payload?.subject)
    });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handleFighterApplications(event) {
  if (!assertInternalBearer(event)) {
    return buildJsonResponse(401, { ok: false, message: "Unauthorized." });
  }

  let body;

  try {
    body = parseJsonBody(event);
  } catch {
    return buildJsonResponse(400, { ok: false, message: "Invalid JSON body." });
  }

  const payload = getPayloadBody(body);
  const requestContext = buildSerializableRequestContext(getRequestContextBody(body), null);
  const stateCode = payload?.state ? getBrazilianStateCode(payload.state) : null;

  try {
    await withDatabaseTransaction(requestContext, async (client) => {
      const fighterApplicationResult = await client.query(
        `
          insert into app.fighter_applications (
            full_name,
            nickname,
            birth_date,
            city,
            state_code,
            team,
            weight_class,
            tapology_profile,
            instagram_profile,
            specialty,
            specialty_other,
            competition_history,
            martial_arts_titles,
            curiosities,
            roast_consent,
            source,
            request_id,
            request_origin,
            request_ip_hash,
            user_agent,
            metadata
          )
          values (
            $1,
            $2,
            $3::date,
            $4,
            $5::char(2),
            $6,
            $7::app.fighter_weight_class_enum,
            $8,
            $9,
            $10::app.fighter_specialty_enum,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19,
            $20,
            $21::jsonb
          )
          returning id
        `,
        [
          normalizeText(payload?.fullName) || null,
          normalizeText(payload?.nickname) || null,
          normalizeText(payload?.birthDate) || null,
          normalizeText(payload?.city) || null,
          stateCode,
          normalizeText(payload?.team) || null,
          normalizeText(payload?.weightClass) || null,
          normalizeText(payload?.tapology) || null,
          normalizeText(payload?.instagram) || null,
          normalizeText(payload?.specialty) || null,
          normalizeText(payload?.specialtyOther) || null,
          normalizeText(payload?.competitionHistory) || null,
          normalizeText(payload?.martialArtsTitles) || null,
          normalizeText(payload?.curiosities) || null,
          Boolean(payload?.roastConsent),
          normalizeText(payload?.source),
          requestContext.requestId,
          requestContext.origin,
          requestContext.requestIpHash,
          requestContext.userAgent,
          JSON.stringify({ surface: "fighter-application" })
        ]
      );

      const fighterApplicationId = fighterApplicationResult.rows[0]?.id;
      const contacts = [];

      if (normalizeText(payload?.phoneWhatsapp)) {
        contacts.push({
          role: "athlete",
          name: null,
          phone: normalizeText(payload?.phoneWhatsapp),
          metadata: JSON.stringify({
            surface: "fighter-application",
            sourceField: "phoneWhatsapp"
          })
        });
      }

      if (
        normalizeText(payload?.bookingContactName) ||
        normalizeText(payload?.bookingContactPhoneWhatsapp)
      ) {
        contacts.push({
          role: "booking_contact",
          name: normalizeNullableText(payload?.bookingContactName),
          phone: normalizeNullableText(payload?.bookingContactPhoneWhatsapp),
          metadata: JSON.stringify({
            surface: "fighter-application",
            sourceField: "bookingContact"
          })
        });
      }

      if (fighterApplicationId && contacts.length > 0) {
        const values = [fighterApplicationId];
        const rows = contacts.map((contact, index) => {
          const offset = 2 + index * 4;

          values.push(contact.role, contact.name, contact.phone, contact.metadata);

          return `($1, $${offset}::app.fighter_application_contact_role_enum, $${offset + 1}, $${offset + 2}, $${offset + 3}::jsonb)`;
        });

        await client.query(
          `
            insert into app.fighter_application_contacts (
              fighter_application_id,
              contact_role,
              contact_name,
              phone_whatsapp,
              metadata
            )
            values
              ${rows.join(",\n              ")}
          `,
          values
        );
      }
    });

    return buildJsonResponse(200, { ok: true });
  } catch (error) {
    console.error("fighter application failed", {
      error,
      fullName: normalizeText(payload?.fullName)
    });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handlePartnerInquiries(event) {
  if (!assertInternalBearer(event)) {
    return buildJsonResponse(401, { ok: false, message: "Unauthorized." });
  }

  let body;

  try {
    body = parseJsonBody(event);
  } catch {
    return buildJsonResponse(400, { ok: false, message: "Invalid JSON body." });
  }

  const payload = getPayloadBody(body);
  const email = normalizeEmail(payload?.email);
  const requestContext = buildSerializableRequestContext(getRequestContextBody(body), email);

  try {
    await withDatabaseTransaction(requestContext, async (client) => {
      await client.query(
        `
          insert into app.partner_inquiries (
            full_name,
            company_name,
            role_title,
            email,
            phone,
            company_profile,
            partnership_intent,
            source,
            request_id,
            request_origin,
            request_ip_hash,
            user_agent,
            metadata
          )
          values (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13::jsonb
          )
        `,
        [
          normalizeText(payload?.fullName),
          normalizeText(payload?.companyName),
          normalizeText(payload?.role),
          email,
          normalizeText(payload?.phone),
          normalizeNullableText(payload?.companyProfile),
          normalizeText(payload?.partnershipIntent),
          normalizeText(payload?.source),
          requestContext.requestId,
          requestContext.origin,
          requestContext.requestIpHash,
          requestContext.userAgent,
          JSON.stringify({ surface: "partner-inquiry" })
        ]
      );
    });

    return buildJsonResponse(200, { ok: true });
  } catch (error) {
    console.error("partner inquiry failed", {
      error,
      email,
      companyName: normalizeText(payload?.companyName)
    });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handleFantasyEntries(event) {
  if (!assertInternalBearer(event)) {
    return buildJsonResponse(401, { ok: false, message: "Unauthorized." });
  }

  let body;

  try {
    body = parseJsonBody(event);
  } catch {
    return buildJsonResponse(400, { ok: false, message: "Invalid JSON body." });
  }

  const payload = getPayloadBody(body);
  const email = normalizeEmail(payload?.email);
  const requestContext = buildSerializableRequestContext(getRequestContextBody(body), email);
  const stateCode = getBrazilianStateCode(payload?.state);

  if (!stateCode) {
    return buildJsonResponse(400, {
      ok: false,
      message: "Selecione um estado válido."
    });
  }

  try {
    const responsePayload = await withDatabaseTransaction(requestContext, async (client) => {
      const entryResult = await client.query(
        `
          insert into app.fantasy_entries (
            event_id,
            full_name,
            email,
            whatsapp,
            city,
            state_code,
            marketing_consent,
            source,
            request_id,
            request_origin,
            request_ip_hash,
            user_agent,
            metadata,
            submitted_at
          )
          values (
            $1::uuid,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13::jsonb,
            now()
          )
          on conflict (event_id, email) do update
          set
            full_name = excluded.full_name,
            whatsapp = excluded.whatsapp,
            city = excluded.city,
            state_code = excluded.state_code,
            marketing_consent = excluded.marketing_consent,
            source = excluded.source,
            request_id = excluded.request_id,
            request_origin = excluded.request_origin,
            request_ip_hash = excluded.request_ip_hash,
            user_agent = excluded.user_agent,
            metadata = app.fantasy_entries.metadata || excluded.metadata,
            submitted_at = excluded.submitted_at,
            updated_at = now()
          returning
            id,
            reference_code as "referenceCode",
            submitted_at as "submittedAt"
        `,
        [
          normalizeText(payload?.eventId),
          normalizeText(payload?.fullName),
          email,
          normalizeText(payload?.whatsapp),
          normalizeText(payload?.city),
          stateCode,
          Boolean(payload?.marketingConsent),
          normalizeText(payload?.source),
          requestContext.requestId,
          requestContext.origin,
          requestContext.requestIpHash,
          requestContext.userAgent,
          JSON.stringify({ surface: "fantasy-entry" })
        ]
      );

      const entry = entryResult.rows[0];

      await client.query("delete from app.fantasy_picks where fantasy_entry_id = $1", [entry.id]);

      for (const pick of Array.isArray(payload?.picks) ? payload.picks : []) {
        await client.query(
          `
            insert into app.fantasy_picks (
              fantasy_entry_id,
              fight_id,
              picked_event_fighter_id,
              predicted_victory_method,
              predicted_round
            )
            values ($1, $2::uuid, $3::uuid, $4::app.victory_method_enum, $5)
          `,
          [
            entry.id,
            normalizeText(pick?.fightId),
            normalizeText(pick?.fighterId),
            normalizeText(pick?.victoryMethod),
            pick?.round
          ]
        );
      }

      return {
        ok: true,
        message:
          "Picks enviados. Quando o resultado oficial entrar, o ranking sobe automaticamente.",
        referenceCode: entry.referenceCode,
        submittedAt: entry.submittedAt
      };
    });

    return buildJsonResponse(200, responsePayload);
  } catch (error) {
    console.error("fantasy entry failed", {
      error,
      email,
      eventId: normalizeText(payload?.eventId)
    });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

function validateUploadedPhotos(photos) {
  if (!Array.isArray(photos)) {
    return "As fotos chegaram em formato inválido.";
  }

  const seenFields = new Set();

  for (const photo of photos) {
    const fieldName = normalizeText(photo?.fieldName);

    if (!EVENT_FIGHTER_PHOTO_FIELDS.includes(fieldName)) {
      return "Uma das fotos enviadas está com campo inválido.";
    }

    if (seenFields.has(fieldName)) {
      return "Uma das fotos foi enviada mais de uma vez.";
    }

    seenFields.add(fieldName);

    if (
      !normalizeText(photo?.bucket) ||
      !normalizeText(photo?.objectKey) ||
      !normalizeText(photo?.contentType) ||
      !normalizeText(photo?.sha256Hex) ||
      !normalizeText(photo?.storageProvider) ||
      !normalizeText(photo?.fileName)
    ) {
      return "Uma das fotos enviadas está incompleta.";
    }

    if (!Number.isFinite(photo?.byteSize) || photo.byteSize <= 0) {
      return "Uma das fotos enviadas está com tamanho inválido.";
    }
  }

  return null;
}

function scoreEventFighterCandidate(candidate, fullName, nickname) {
  const normalizedFullName = normalizeNameForMatch(fullName);
  const normalizedNickname = normalizeNameForMatch(nickname);
  let score = -1;

  const legalName = normalizeNameForMatch(candidate.legalName);
  const displayName = normalizeNameForMatch(candidate.displayName);
  const fighterNickname = normalizeNameForMatch(candidate.fighterNickname);
  const cardName = normalizeNameForMatch(candidate.cardName);

  if (normalizedFullName && normalizedFullName === legalName) {
    score = Math.max(score, 400);
  }

  if (normalizedFullName && normalizedFullName === displayName) {
    score = Math.max(score, 360);
  }

  if (normalizedFullName && normalizedFullName === cardName) {
    score = Math.max(score, 340);
  }

  if (normalizedNickname && normalizedNickname === fighterNickname) {
    score = Math.max(score, 260);
  }

  if (normalizedNickname && normalizedNickname === displayName) {
    score = Math.max(score, 220);
  }

  if (normalizedNickname && normalizedNickname === cardName) {
    score = Math.max(score, 210);
  }

  return score;
}

async function findExistingUnlinkedEventFighterIntake(email) {
  const result = await getDatabasePool().query(
    `
      select
        id as "intakeId"
      from app.event_fighter_intakes
      where event_fighter_id is null
        and source = $1
        and email = $2
      order by submitted_at desc
      limit 1
    `,
    [EVENT_FIGHTER_INTAKE_SOURCE, email]
  );

  return result.rows[0]?.intakeId ?? null;
}

async function handleEventFighterIntake(event) {
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

  const payload = body?.payload ?? null;
  const photos = body?.photos ?? null;
  const requestContext = body?.requestContext ?? {};

  const fullName = normalizeText(payload?.fullName);
  const nickname = normalizeText(payload?.nickname);
  const accessEmail = normalizeEmail(payload?.accessEmail);
  const email = normalizeEmail(payload?.email);

  if (!fullName || !nickname || !accessEmail || !email) {
    return buildJsonResponse(400, {
      ok: false,
      message: "A ficha chegou incompleta no backend."
    });
  }

  if (email !== accessEmail) {
    return buildJsonResponse(400, {
      ok: false,
      message: "Use no formulario o mesmo email utilizado para acessar a pagina."
    });
  }

  if (normalizeText(payload?.source) !== EVENT_FIGHTER_INTAKE_SOURCE) {
    return buildJsonResponse(400, {
      ok: false,
      message: "Origem da ficha invalida."
    });
  }

  const photoValidationError = validateUploadedPhotos(photos);

  if (photoValidationError) {
    return buildJsonResponse(400, {
      ok: false,
      message: photoValidationError
    });
  }

  const existingIntakeId = await findExistingUnlinkedEventFighterIntake(email);

  try {
    await withDatabaseTransaction(
      {
        actorId: null,
        actorRole: "service",
        actorEmail: accessEmail,
        requestId: normalizeText(requestContext?.requestId) || randomUUID(),
        clientIp: normalizeText(requestContext?.clientIp) || null,
        origin: normalizeText(requestContext?.requestOrigin) || null,
        userAgent: normalizeText(requestContext?.userAgent) || null
      },
      async (client) => {
        const intakeId = existingIntakeId ?? randomUUID();
        const requestId = normalizeText(requestContext?.requestId) || randomUUID();
        const requestOrigin = normalizeText(requestContext?.requestOrigin) || null;
        const requestIpHash = normalizeText(requestContext?.requestIpHash) || null;
        const userAgent = normalizeText(requestContext?.userAgent) || null;
        const metadata = JSON.stringify({
          surface: "event-fighter-intake-lambda",
          accessEmail,
          submissionMode: "shared-password"
        });

        if (existingIntakeId) {
          await client.query(
            `
              update app.event_fighter_intakes
              set
                submitted_by_account_id = null,
                full_name = $2,
                nickname = $3,
                email = $4,
                phone_whatsapp = $5,
                birth_date = $6::date,
                cpf_ciphertext = app.encrypt_secret($7),
                cpf_digest = app.secret_digest($8),
                cpf_last4 = app.last_four_digits($9),
                pix_key_type = $10::app.pix_key_type_enum,
                pix_key_ciphertext = app.encrypt_secret($11),
                pix_key_digest = app.secret_digest($12),
                pix_key_last4 = app.last_four_digits($13),
                has_health_insurance = $14,
                health_insurance_provider = $15,
                record_summary = $16,
                primary_specialty = $17,
                additional_specialties = $18,
                competition_history = $19,
                titles_won = $20,
                life_story = $21,
                funny_story = $22,
                curiosities = $23,
                hobbies = $24,
                source = $25,
                intake_status = 'submitted',
                reviewed_by_account_id = null,
                reviewed_at = null,
                staff_notes = null,
                request_id = $26,
                request_origin = $27,
                request_ip_hash = $28,
                user_agent = $29,
                metadata = app.event_fighter_intakes.metadata || $30::jsonb,
                submitted_at = now(),
                updated_at = now()
              where id = $1::uuid
            `,
            [
              existingIntakeId,
              payload.fullName,
              payload.nickname,
              email,
              payload.phoneWhatsapp,
              payload.birthDate,
              payload.cpf,
              String(payload.cpf ?? "").replace(/\D+/g, ""),
              payload.cpf,
              payload.pixKeyType,
              payload.pixKey,
              payload.pixKey,
              payload.pixKey,
              Boolean(payload.hasHealthInsurance),
              payload.hasHealthInsurance ? payload.healthInsuranceProvider : null,
              payload.record,
              payload.primarySpecialty,
              payload.additionalSpecialties,
              payload.competitionHistory,
              payload.titlesWon,
              payload.lifeStory,
              payload.funnyStory,
              payload.curiosities,
              payload.hobbies,
              payload.source,
              requestId,
              requestOrigin,
              requestIpHash,
              userAgent,
              metadata
            ]
          );
        } else {
          await client.query(
            `
              insert into app.event_fighter_intakes (
                id,
                event_fighter_id,
                submitted_by_account_id,
                full_name,
                nickname,
                email,
                phone_whatsapp,
                birth_date,
                cpf_ciphertext,
                cpf_digest,
                cpf_last4,
                pix_key_type,
                pix_key_ciphertext,
                pix_key_digest,
                pix_key_last4,
                has_health_insurance,
                health_insurance_provider,
                record_summary,
                primary_specialty,
                additional_specialties,
                competition_history,
                titles_won,
                life_story,
                funny_story,
                curiosities,
                hobbies,
                source,
                intake_status,
                request_id,
                request_origin,
                request_ip_hash,
                user_agent,
                metadata,
                submitted_at
              )
              values (
                $1::uuid,
                null,
                null,
                $2,
                $3,
                $4,
                $5,
                $6::date,
                app.encrypt_secret($7),
                app.secret_digest($8),
                app.last_four_digits($9),
                $10::app.pix_key_type_enum,
                app.encrypt_secret($11),
                app.secret_digest($12),
                app.last_four_digits($13),
                $14,
                $15,
                $16,
                $17,
                $18,
                $19,
                $20,
                $21,
                $22,
                $23,
                $24,
                $25,
                'submitted',
                $26,
                $27,
                $28,
                $29,
                $30::jsonb,
                now()
              )
            `,
            [
              intakeId,
              payload.fullName,
              payload.nickname,
              email,
              payload.phoneWhatsapp,
              payload.birthDate,
              payload.cpf,
              String(payload.cpf ?? "").replace(/\D+/g, ""),
              payload.cpf,
              payload.pixKeyType,
              payload.pixKey,
              payload.pixKey,
              payload.pixKey,
              Boolean(payload.hasHealthInsurance),
              payload.hasHealthInsurance ? payload.healthInsuranceProvider : null,
              payload.record,
              payload.primarySpecialty,
              payload.additionalSpecialties,
              payload.competitionHistory,
              payload.titlesWon,
              payload.lifeStory,
              payload.funnyStory,
              payload.curiosities,
              payload.hobbies,
              payload.source,
              requestId,
              requestOrigin,
              requestIpHash,
              userAgent,
              metadata
            ]
          );
        }

        for (const photo of photos) {
          await client.query(
            `
              insert into app.event_fighter_intake_photos (
                intake_id,
                field_name,
                storage_provider,
                storage_bucket,
                object_key,
                original_file_name,
                content_type,
                byte_size,
                sha256_hex
              )
              values (
                $1::uuid,
                $2::app.event_photo_field_enum,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9
              )
              on conflict (intake_id, field_name) do update
              set
                storage_provider = excluded.storage_provider,
                storage_bucket = excluded.storage_bucket,
                object_key = excluded.object_key,
                original_file_name = excluded.original_file_name,
                content_type = excluded.content_type,
                byte_size = excluded.byte_size,
                sha256_hex = excluded.sha256_hex,
                updated_at = now()
            `,
            [
              intakeId,
              toDatabaseEventPhotoFieldName(photo.fieldName),
              photo.storageProvider,
              photo.bucket,
              photo.objectKey,
              photo.fileName,
              photo.contentType,
              photo.byteSize,
              photo.sha256Hex
            ]
          );
        }
      },
      {
        requiresEncryptionKey: true
      }
    );

    return buildJsonResponse(200, {
      ok: true,
      message: "Ficha recebida. Se precisarmos complementar algo, a equipe entra em contato."
    });
  } catch (error) {
    console.error("event fighter intake failed", {
      error,
      accessEmail,
      fullName,
      nickname
    });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível. Tenta novamente daqui a pouco."
    });
  }
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

    if (method === "POST" && rawPath === NEWSLETTER_SUBSCRIBE_PATH) {
      return await handleNewsletterSubscribe(event);
    }

    if (method === "POST" && rawPath === CONTACT_MESSAGES_PATH) {
      return await handleContactMessages(event);
    }

    if (method === "POST" && rawPath === FIGHTER_APPLICATIONS_PATH) {
      return await handleFighterApplications(event);
    }

    if (method === "POST" && rawPath === PARTNER_INQUIRIES_PATH) {
      return await handlePartnerInquiries(event);
    }

    if (method === "POST" && rawPath === FANTASY_ENTRIES_PATH) {
      return await handleFantasyEntries(event);
    }

    if (method === "POST" && rawPath === EVENT_FIGHTER_INTAKE_PATH) {
      return await handleEventFighterIntake(event);
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
