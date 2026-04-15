import {
  createHash,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

import pg from "pg";

import {
  GOOGLE_SHEETS_EXPORT_ROUTE_BASE,
  GOOGLE_SHEETS_EXPORTS
} from "./google-sheets-exports.mjs";

const { Pool } = pg;
const scrypt = promisify(scryptCallback);

const EVENT_FIGHTER_ACCESS_PATH = "/v1/event-fighter-access/session";
const ADMIN_DATABASE_OVERVIEW_PATH = "/v1/admin/database-overview";
const ADMIN_DATABASE_ROUTE_BASE = "/v1/admin/database";
const EVENT_FIGHTER_INTAKE_PATH = "/v1/event-fighter-intakes";
const NEWSLETTER_SUBSCRIBE_PATH = "/v1/newsletter/subscriptions";
const CONTACT_MESSAGES_PATH = "/v1/contact-messages";
const FIGHTER_APPLICATIONS_PATH = "/v1/fighter-applications";
const PARTNER_INQUIRIES_PATH = "/v1/partner-inquiries";
const FANTASY_EVENTS_PATH = "/v1/fantasy/events";
const ADMIN_FANTASY_EVENTS_PATH = "/v1/admin/fantasy/events";
const FANTASY_ENTRIES_PATH = "/v1/fantasy/entries";
const HEALTHCHECK_PATH = "/health";
const ADMIN_TABLE_PREVIEW_LIMIT = 6;
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
const ADMIN_NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR");
const ADMIN_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short"
});
const ADMIN_STATUS_LABELS = {
  active: "Ativo",
  approved: "Aprovado",
  archived: "Arquivado",
  bounced: "Bounce",
  changes_requested: "Ajustes solicitados",
  contacted: "Contatado",
  converted: "Convertido",
  disqualified: "Desclassificado",
  disabled: "Desativado",
  draft: "Rascunho",
  finished: "Encerrado",
  invited: "Convidado",
  locked: "Travado",
  new: "Novo",
  pending: "Pendente",
  published: "Publicado",
  qualified: "Qualificado",
  rejected: "Rejeitado",
  responded: "Respondido",
  reviewing: "Em revisão",
  shortlisted: "Selecionado",
  submitted: "Enviado",
  subscribed: "Inscrito",
  under_review: "Em revisão",
  unsubscribed: "Descadastrado",
  voided: "Invalidado"
};
const ADMIN_SOURCE_LABELS = {
  contact_page: "Contato",
  fighter_application: "Cadastro de lutador",
  newsletter_signup: "Newsletter",
  partner_inquiry: "Parceria",
  press_newsletter: "Newsletter imprensa"
};
const FANTASY_ADMIN_STATUS_VALUES = new Set(["draft", "published", "locked", "finished"]);
const FANTASY_ADMIN_VICTORY_METHODS = new Set(["decisao", "finalizacao", "nocaute"]);
const FANTASY_ADMIN_ROUNDS = new Set([1, 2, 3, 4, 5]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const allowInvalidCertificates =
      process.env.DATABASE_SSL_ALLOW_INVALID_CERTIFICATES?.trim().toLowerCase() === "true";

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
              rejectUnauthorized: !allowInvalidCertificates
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

function sha256Buffer(value) {
  return createHash("sha256").update(value).digest();
}

function safeCompareText(left, right) {
  if (!left || !right) {
    return false;
  }

  return timingSafeEqual(sha256Buffer(left), sha256Buffer(right));
}

function getScopeBearerCandidates(scope) {
  const candidates = [];

  if (scope === "public_write") {
    const specificToken = process.env.PUBLIC_API_BEARER_TOKEN?.trim();

    if (specificToken) {
      candidates.push(specificToken);
    }
  }

  if (scope === "portal") {
    const specificToken = process.env.PORTAL_API_BEARER_TOKEN?.trim();

    if (specificToken) {
      candidates.push(specificToken);
    }
  }

  if (scope === "admin_read") {
    const specificToken = process.env.ADMIN_READ_API_BEARER_TOKEN?.trim();

    if (specificToken) {
      candidates.push(specificToken);
    }
  }

  if (scope === "admin_write") {
    const specificToken = process.env.ADMIN_WRITE_API_BEARER_TOKEN?.trim();

    if (specificToken) {
      candidates.push(specificToken);
    }
  }

  const legacyToken = process.env.INTERNAL_API_BEARER_TOKEN?.trim();

  if (legacyToken) {
    candidates.push(legacyToken);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function assertBearerForScope(event, scope) {
  const expectedTokens = getScopeBearerCandidates(scope);
  const authorization = getHeader(event.headers, "authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme !== "Bearer" || !token || expectedTokens.length === 0) {
    return false;
  }

  return expectedTokens.some((expectedToken) => safeCompareText(token, expectedToken));
}

function getGoogleSheetsExportExpectedToken(exportConfig) {
  if (exportConfig?.bearerEnvName) {
    const dedicatedToken = process.env[exportConfig.bearerEnvName]?.trim();

    if (dedicatedToken) {
      return dedicatedToken;
    }
  }

  const sharedToken = process.env.GOOGLE_SHEETS_EXPORT_BEARER_TOKEN?.trim();

  if (sharedToken) {
    return sharedToken;
  }

  return getRequiredEnv("INTERNAL_API_BEARER_TOKEN");
}

function assertGoogleSheetsExportBearer(event, exportConfig) {
  const expectedToken = getGoogleSheetsExportExpectedToken(exportConfig);
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

function normalizeFantasyAdminText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeFantasyAdminSlug(value, fallback) {
  const base = normalizeFantasyAdminText(value) || fallback;

  return base
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isUuid(value) {
  return typeof value === "string" && UUID_PATTERN.test(value);
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
const fantasyStateCodeToName = new Map(BRAZILIAN_STATES.map((state) => [state.code, state.name]));

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

function parsePositiveInteger(value, fallback, maxValue = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(parsed, maxValue);
}

async function loadGoogleSheetsExportPage(exportConfig, options) {
  const limit = Math.max(1, Math.min(options.limit ?? 1000, 1000));
  const offset = Math.max(0, options.offset ?? 0);
  const selectList = exportConfig.select ?? exportConfig.columns;
  const fromClause = exportConfig.fromClause ?? exportConfig.tableName;
  const queryText = `
    select ${selectList.join(", ")}
    from ${fromClause}
    order by ${exportConfig.orderBy}
    limit $1
    offset $2
  `;
  const result = await withDatabaseTransaction(
    {
      actorId: null,
      actorRole: "service",
      actorEmail: null,
      requestId: `google-sheets-export-${exportConfig.key}-${offset}`,
      clientIp: null,
      origin: "google-sheets-export",
      userAgent: "google-sheets-export"
    },
    async (client) => client.query(queryText, [limit, offset]),
    {
      requiresEncryptionKey: exportConfig.requiresEncryptionKey === true
    }
  );

  return {
    key: exportConfig.key,
    sheetName: exportConfig.sheetName,
    columns: exportConfig.columns,
    rows: result.rows
  };
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

function adminHumanizeToken(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "—";
  }

  return normalized
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => {
      const lowerPart = part.toLowerCase();

      if (["mma", "ufc", "cpf", "pix", "uf"].includes(lowerPart)) {
        return lowerPart.toUpperCase();
      }

      return lowerPart.charAt(0).toUpperCase() + lowerPart.slice(1);
    })
    .join(" ");
}

function adminFormatText(value) {
  return normalizeText(value) || "—";
}

function adminParseCount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function adminFormatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return ADMIN_DATE_TIME_FORMATTER.format(date);
}

function adminFormatStatus(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "—";
  }

  return ADMIN_STATUS_LABELS[normalized] ?? adminHumanizeToken(normalized);
}

function adminFormatSource(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "—";
  }

  return ADMIN_SOURCE_LABELS[normalized.replace(/-/g, "_")] ?? adminHumanizeToken(normalized);
}

function adminFormatWeightClass(value) {
  return adminHumanizeToken(value);
}

function adminFormatScore(value) {
  return `${ADMIN_NUMBER_FORMATTER.format(adminParseCount(value))} pts`;
}

function adminFormatPhotoCount(value) {
  const count = adminParseCount(value);

  return `${ADMIN_NUMBER_FORMATTER.format(count)} ${count === 1 ? "foto" : "fotos"}`;
}

function adminBuildLocation(city, stateCode) {
  const normalizedCity = normalizeText(city);
  const normalizedStateCode = normalizeText(stateCode);

  if (normalizedCity && normalizedStateCode) {
    return `${normalizedCity}, ${normalizedStateCode}`;
  }

  return normalizedCity || normalizedStateCode || "—";
}

function adminFormatBoolean(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value ? "Sim" : "Não";
}

function adminFormatAccountLabel(displayName, email) {
  const parts = [normalizeText(displayName), normalizeText(email)].filter(Boolean);

  return parts.length ? parts.join(" / ") : "—";
}

function adminCreateRow(id, cells) {
  return {
    id,
    cells
  };
}

function adminCreateSection(title, fields) {
  return {
    title,
    fields
  };
}

async function loadAdminTableSummary(text, values = []) {
  const result = await getDatabasePool().query(text, values);
  const row = result.rows[0] ?? {};

  return {
    totalRows: adminParseCount(row.totalRows),
    lastActivityAt: row.lastActivityAt ? adminFormatDateTime(row.lastActivityAt) : null
  };
}

async function loadAdminStatusCounts(text, values = []) {
  const result = await getDatabasePool().query(text, values);

  return result.rows.map((row) => ({
    label: adminFormatStatus(row.status),
    value: adminParseCount(row.total)
  }));
}

async function withAdminTableFallback(config, load) {
  try {
    return await load();
  } catch (error) {
    console.error(`[admin-database] failed to load ${config.tableName}`, error);

    return {
      ...config,
      rows: [],
      statusCounts: [],
      totalRows: null,
      lastActivityAt: null,
      errorMessage: "Não foi possível ler esta tabela no ambiente atual."
    };
  }
}

const ADMIN_DATABASE_TABLES = {
  "contact-messages": {
    id: "contact-messages",
    label: "Mensagens de Contato",
    tableName: "app.contact_messages",
    description: "Leads enviados pelo formulário público de contato.",
    previewLabel: "Últimas mensagens"
  },
  "newsletter-subscriptions": {
    id: "newsletter-subscriptions",
    label: "Newsletter",
    tableName: "app.newsletter_subscriptions",
    description: "Inscrições captadas pelas áreas públicas e pela imprensa.",
    previewLabel: "Últimas inscrições"
  },
  "partner-inquiries": {
    id: "partner-inquiries",
    label: "Parceiros",
    tableName: "app.partner_inquiries",
    description: "Empresas e marcas que entraram pelo fluxo comercial.",
    previewLabel: "Últimas oportunidades"
  },
  "fighter-applications": {
    id: "fighter-applications",
    label: "Cadastro de Lutadores",
    tableName: "app.fighter_applications",
    description: "Aplicações enviadas por atletas interessados em participar do projeto.",
    previewLabel: "Últimos cadastros"
  },
  "event-fighter-intakes": {
    id: "event-fighter-intakes",
    label: "Intake de Evento",
    tableName: "app.event_fighter_intakes",
    description: "Fichas operacionais enviadas pelos lutadores para cada edição.",
    previewLabel: "Últimos intakes"
  },
  "fantasy-entries": {
    id: "fantasy-entries",
    label: "Entradas do Fantasy",
    tableName: "app.fantasy_entries",
    description: "Participações submetidas pelos usuários no fantasy oficial.",
    previewLabel: "Últimas entradas"
  }
};

async function loadAdminContactMessagesTable() {
  const config = {
    id: "contact-messages",
    label: "Mensagens de Contato",
    tableName: "app.contact_messages",
    description: "Leads enviados pelo formulário público de contato.",
    previewLabel: "Últimas mensagens",
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "fullName", label: "Nome" },
      { key: "email", label: "Email" },
      { key: "subject", label: "Assunto" },
      { key: "status", label: "Status" }
    ]
  };

  return withAdminTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadAdminTableSummary(`
        select
          count(*)::int as "totalRows",
          max(updated_at) as "lastActivityAt"
        from app.contact_messages
      `),
      loadAdminStatusCounts(`
        select
          status,
          count(*)::int as total
        from app.contact_messages
        group by status
        order by count(*) desc, status asc
      `),
      getDatabasePool().query(`
        select
          id,
          created_at as "createdAt",
          full_name as "fullName",
          email,
          subject,
          status
        from app.contact_messages
        order by created_at desc
        limit ${ADMIN_TABLE_PREVIEW_LIMIT}
      `)
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        adminCreateRow(row.id, {
          createdAt: adminFormatDateTime(row.createdAt),
          fullName: adminFormatText(row.fullName),
          email: adminFormatText(row.email),
          subject: adminFormatText(row.subject),
          status: adminFormatStatus(row.status)
        })
      )
    };
  });
}

async function loadAdminNewsletterSubscriptionsTable() {
  const config = {
    id: "newsletter-subscriptions",
    label: "Newsletter",
    tableName: "app.newsletter_subscriptions",
    description: "Inscrições captadas pelas áreas públicas e pela imprensa.",
    previewLabel: "Últimas inscrições",
    columns: [
      { key: "subscribedAt", label: "Data" },
      { key: "email", label: "Email" },
      { key: "fullName", label: "Nome" },
      { key: "source", label: "Origem" },
      { key: "status", label: "Status" }
    ]
  };

  return withAdminTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadAdminTableSummary(`
        select
          count(*)::int as "totalRows",
          max(updated_at) as "lastActivityAt"
        from app.newsletter_subscriptions
      `),
      loadAdminStatusCounts(`
        select
          status,
          count(*)::int as total
        from app.newsletter_subscriptions
        group by status
        order by count(*) desc, status asc
      `),
      getDatabasePool().query(`
        select
          id,
          subscribed_at as "subscribedAt",
          email,
          metadata ->> 'fullName' as "fullName",
          source,
          status
        from app.newsletter_subscriptions
        order by subscribed_at desc
        limit ${ADMIN_TABLE_PREVIEW_LIMIT}
      `)
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        adminCreateRow(row.id, {
          subscribedAt: adminFormatDateTime(row.subscribedAt),
          email: adminFormatText(row.email),
          fullName: adminFormatText(row.fullName),
          source: adminFormatSource(row.source),
          status: adminFormatStatus(row.status)
        })
      )
    };
  });
}

async function loadAdminPartnerInquiriesTable() {
  const config = {
    id: "partner-inquiries",
    label: "Parceiros",
    tableName: "app.partner_inquiries",
    description: "Empresas e marcas que entraram pelo fluxo comercial.",
    previewLabel: "Últimas oportunidades",
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "companyName", label: "Empresa" },
      { key: "fullName", label: "Contato" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" }
    ]
  };

  return withAdminTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadAdminTableSummary(`
        select
          count(*)::int as "totalRows",
          max(updated_at) as "lastActivityAt"
        from app.partner_inquiries
      `),
      loadAdminStatusCounts(`
        select
          status,
          count(*)::int as total
        from app.partner_inquiries
        group by status
        order by count(*) desc, status asc
      `),
      getDatabasePool().query(`
        select
          id,
          created_at as "createdAt",
          company_name as "companyName",
          full_name as "fullName",
          email,
          status
        from app.partner_inquiries
        order by created_at desc
        limit ${ADMIN_TABLE_PREVIEW_LIMIT}
      `)
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        adminCreateRow(row.id, {
          createdAt: adminFormatDateTime(row.createdAt),
          companyName: adminFormatText(row.companyName),
          fullName: adminFormatText(row.fullName),
          email: adminFormatText(row.email),
          status: adminFormatStatus(row.status)
        })
      )
    };
  });
}

async function loadAdminFighterApplicationsTable() {
  const config = {
    id: "fighter-applications",
    label: "Cadastro de Lutadores",
    tableName: "app.fighter_applications",
    description: "Aplicações enviadas por atletas interessados em participar do projeto.",
    previewLabel: "Últimos cadastros",
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "fighter", label: "Lutador" },
      { key: "weightClass", label: "Categoria" },
      { key: "location", label: "Cidade" },
      { key: "athleteWhatsapp", label: "WhatsApp" },
      { key: "status", label: "Status" }
    ]
  };

  return withAdminTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadAdminTableSummary(`
        select
          count(*)::int as "totalRows",
          max(updated_at) as "lastActivityAt"
        from app.fighter_applications
      `),
      loadAdminStatusCounts(`
        select
          status,
          count(*)::int as total
        from app.fighter_applications
        group by status
        order by count(*) desc, status asc
      `),
      getDatabasePool().query(`
        select
          fa.id,
          fa.created_at as "createdAt",
          fa.full_name as "fullName",
          fa.nickname,
          fa.weight_class as "weightClass",
          fa.city,
          fa.state_code as "stateCode",
          contact.phone_whatsapp as "athleteWhatsapp",
          fa.status
        from app.fighter_applications fa
        left join app.fighter_application_contacts contact
          on contact.fighter_application_id = fa.id
         and contact.contact_role = 'athlete'
        order by fa.created_at desc
        limit ${ADMIN_TABLE_PREVIEW_LIMIT}
      `)
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        adminCreateRow(row.id, {
          createdAt: adminFormatDateTime(row.createdAt),
          fighter:
            [normalizeText(row.fullName), normalizeText(row.nickname)]
              .filter(Boolean)
              .join(" / ") || "—",
          weightClass: adminFormatWeightClass(row.weightClass),
          location: adminBuildLocation(row.city, row.stateCode),
          athleteWhatsapp: adminFormatText(row.athleteWhatsapp),
          status: adminFormatStatus(row.status)
        })
      )
    };
  });
}

async function loadAdminEventFighterIntakesTable() {
  const config = {
    id: "event-fighter-intakes",
    label: "Intake de Evento",
    tableName: "app.event_fighter_intakes",
    description: "Fichas operacionais enviadas pelos lutadores para cada edição.",
    previewLabel: "Últimos intakes",
    columns: [
      { key: "submittedAt", label: "Enviado em" },
      { key: "fighter", label: "Atleta" },
      { key: "email", label: "Email" },
      { key: "phoneWhatsapp", label: "WhatsApp" },
      { key: "photoCount", label: "Fotos" },
      { key: "intakeStatus", label: "Status" }
    ]
  };

  return withAdminTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadAdminTableSummary(`
        select
          count(*)::int as "totalRows",
          max(updated_at) as "lastActivityAt"
        from app.event_fighter_intakes
      `),
      loadAdminStatusCounts(`
        select
          intake_status as status,
          count(*)::int as total
        from app.event_fighter_intakes
        group by intake_status
        order by count(*) desc, intake_status asc
      `),
      getDatabasePool().query(`
        select
          intake.id,
          intake.submitted_at as "submittedAt",
          intake.full_name as "fullName",
          intake.nickname,
          intake.email,
          intake.phone_whatsapp as "phoneWhatsapp",
          intake.intake_status as "intakeStatus",
          coalesce(photo_counts.total, 0)::int as "photoCount"
        from app.event_fighter_intakes intake
        left join lateral (
          select count(*)::int as total
          from app.event_fighter_intake_photos photo
          where photo.intake_id = intake.id
        ) photo_counts on true
        order by intake.submitted_at desc
        limit ${ADMIN_TABLE_PREVIEW_LIMIT}
      `)
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        adminCreateRow(row.id, {
          submittedAt: adminFormatDateTime(row.submittedAt),
          fighter:
            [normalizeText(row.fullName), normalizeText(row.nickname)]
              .filter(Boolean)
              .join(" / ") || "—",
          email: adminFormatText(row.email),
          phoneWhatsapp: adminFormatText(row.phoneWhatsapp),
          photoCount: adminFormatPhotoCount(row.photoCount),
          intakeStatus: adminFormatStatus(row.intakeStatus)
        })
      )
    };
  });
}

async function loadAdminFantasyEntriesTable() {
  const config = {
    id: "fantasy-entries",
    label: "Entradas do Fantasy",
    tableName: "app.fantasy_entries",
    description: "Participações submetidas pelos usuários no fantasy oficial.",
    previewLabel: "Últimas entradas",
    columns: [
      { key: "submittedAt", label: "Enviado em" },
      { key: "eventName", label: "Evento" },
      { key: "displayName", label: "Jogador" },
      { key: "location", label: "Cidade" },
      { key: "scoreCached", label: "Pontuação" },
      { key: "entryStatus", label: "Status" }
    ]
  };

  return withAdminTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadAdminTableSummary(`
        select
          count(*)::int as "totalRows",
          max(updated_at) as "lastActivityAt"
        from app.fantasy_entries
      `),
      loadAdminStatusCounts(`
        select
          entry_status as status,
          count(*)::int as total
        from app.fantasy_entries
        group by entry_status
        order by count(*) desc, entry_status asc
      `),
      getDatabasePool().query(`
        select
          entry.id,
          entry.submitted_at as "submittedAt",
          event.name as "eventName",
          entry.display_name as "displayName",
          entry.city,
          entry.state_code as "stateCode",
          entry.score_cached as "scoreCached",
          entry.entry_status as "entryStatus"
        from app.fantasy_entries entry
        join app.events event
          on event.id = entry.event_id
        order by entry.submitted_at desc
        limit ${ADMIN_TABLE_PREVIEW_LIMIT}
      `)
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        adminCreateRow(row.id, {
          submittedAt: adminFormatDateTime(row.submittedAt),
          eventName: adminFormatText(row.eventName),
          displayName: adminFormatText(row.displayName),
          location: adminBuildLocation(row.city, row.stateCode),
          scoreCached: adminFormatScore(row.scoreCached),
          entryStatus: adminFormatStatus(row.entryStatus)
        })
      )
    };
  });
}

async function loadAdminDatabaseOverviewFromDatabase() {
  const tables = await Promise.all([
    loadAdminContactMessagesTable(),
    loadAdminNewsletterSubscriptionsTable(),
    loadAdminPartnerInquiriesTable(),
    loadAdminFighterApplicationsTable(),
    loadAdminEventFighterIntakesTable(),
    loadAdminFantasyEntriesTable()
  ]);

  const availableTables = tables.filter((table) => !table.errorMessage).length;
  const unavailableTables = tables.length - availableTables;
  const totalRows = tables.reduce(
    (sum, table) => sum + (table.totalRows ?? 0),
    0
  );

  return {
    databaseConfigured: true,
    totalRows,
    tables,
    availableTables,
    unavailableTables
  };
}

async function handleAdminDatabaseOverview(event) {
  if (!assertBearerForScope(event, "admin_read")) {
    return buildJsonResponse(401, {
      ok: false,
      message: "Unauthorized."
    });
  }

  try {
    return buildJsonResponse(200, await loadAdminDatabaseOverviewFromDatabase());
  } catch (error) {
    console.error("admin database overview failed", { error });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

function mapFantasyEntryState(stateCode) {
  return fantasyStateCodeToName.get(stateCode) ?? "São Paulo";
}

function buildFantasyEventSkeleton(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    startsAt: row.startsAt,
    lockAt: row.lockAt,
    status: row.status,
    venue: row.venue,
    cityLabel: adminBuildLocation(row.cityName, row.stateCode),
    heroLabel: row.heroLabel,
    broadcastLabel: row.broadcastLabel,
    statusText: row.statusText,
    scoringRules: {
      winner: adminParseCount(row.winnerPoints),
      method: adminParseCount(row.methodPoints),
      round: adminParseCount(row.roundPoints),
      perfectPickBonus: adminParseCount(row.perfectPickBonus)
    },
    fights: [],
    entries: []
  };
}

class FantasyAdminEventSaveValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FantasyAdminEventSaveValidationError";
  }
}

function ensureFantasyAdminText(value, label, minimumLength = 1) {
  if (value.length < minimumLength) {
    throw new FantasyAdminEventSaveValidationError(`${label} precisa ser preenchido.`);
  }

  return value;
}

function parseFantasyAdminDate(value, label) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new FantasyAdminEventSaveValidationError(`${label} está com uma data inválida.`);
  }

  return date.toISOString();
}

function parseFantasyAdminCityLabel(value) {
  const normalized = ensureFantasyAdminText(
    normalizeFantasyAdminText(value),
    "Cidade / Estado",
    2
  );
  const [cityPart, statePart] = normalized.split(",").map((part) => part.trim());

  return {
    cityName: ensureFantasyAdminText(cityPart || normalized, "Cidade / Estado", 2),
    stateCode: statePart ? getBrazilianStateCode(statePart) || null : null
  };
}

function normalizeFantasyAdminScoringRules(input) {
  const winner = Number(input?.winner);
  const method = Number(input?.method);
  const round = Number(input?.round);
  const perfectPickBonus = Number(input?.perfectPickBonus);

  return {
    winner: Number.isFinite(winner) && winner >= 0 ? Math.trunc(winner) : 10,
    method: Number.isFinite(method) && method >= 0 ? Math.trunc(method) : 6,
    round: Number.isFinite(round) && round >= 0 ? Math.trunc(round) : 4,
    perfectPickBonus:
      Number.isFinite(perfectPickBonus) && perfectPickBonus >= 0
        ? Math.trunc(perfectPickBonus)
        : 3
  };
}

function normalizeFantasyAdminCorner(corner, fallbackPrefix) {
  const originalId =
    normalizeFantasyAdminText(corner?.id) || `${fallbackPrefix}-${randomUUID()}`;

  return {
    id: isUuid(corner?.id) ? corner.id : null,
    originalId,
    name: ensureFantasyAdminText(
      normalizeFantasyAdminText(corner?.name),
      "Nome do atleta",
      2
    ),
    country: ensureFantasyAdminText(
      normalizeFantasyAdminText(corner?.country) || "Brasil",
      "País",
      2
    )
  };
}

function normalizeFantasyAdminFightResult(fight, redCornerOriginalId, blueCornerOriginalId) {
  const winnerId = normalizeFantasyAdminText(fight?.result?.winnerId);
  const victoryMethod = normalizeFantasyAdminText(fight?.result?.victoryMethod);
  const round = Number(fight?.result?.round);

  if (!winnerId && !victoryMethod && !fight?.result?.round) {
    return null;
  }

  if (
    !winnerId ||
    !FANTASY_ADMIN_VICTORY_METHODS.has(victoryMethod) ||
    !FANTASY_ADMIN_ROUNDS.has(round)
  ) {
    throw new FantasyAdminEventSaveValidationError(
      "O resultado oficial precisa ter vencedor, método e round válidos."
    );
  }

  const winnerSide =
    winnerId === redCornerOriginalId ? "red" : winnerId === blueCornerOriginalId ? "blue" : null;

  if (!winnerSide) {
    throw new FantasyAdminEventSaveValidationError(
      "O vencedor oficial precisa ser um dos atletas da luta."
    );
  }

  if (round > (fight?.maxRound === 5 ? 5 : 3)) {
    throw new FantasyAdminEventSaveValidationError(
      "O round oficial não pode ser maior que o total de rounds da luta."
    );
  }

  return {
    winnerSide,
    victoryMethod,
    round
  };
}

function normalizeFantasyAdminEventPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new FantasyAdminEventSaveValidationError("Evento inválido para salvar.");
  }

  const name = ensureFantasyAdminText(
    normalizeFantasyAdminText(payload.name),
    "Nome do evento",
    3
  );
  const slug = normalizeFantasyAdminSlug(payload.slug, name);

  if (!slug) {
    throw new FantasyAdminEventSaveValidationError("Slug do evento inválido.");
  }

  const startsAt = parseFantasyAdminDate(payload.startsAt, "Início do evento");
  const lockAt = parseFantasyAdminDate(payload.lockAt, "Lock das picks");

  if (new Date(lockAt).getTime() > new Date(startsAt).getTime()) {
    throw new FantasyAdminEventSaveValidationError(
      "O lock das picks precisa acontecer antes do início do evento."
    );
  }

  if (!FANTASY_ADMIN_STATUS_VALUES.has(payload.status)) {
    throw new FantasyAdminEventSaveValidationError("Status do evento inválido.");
  }

  const city = parseFantasyAdminCityLabel(payload.cityLabel);
  const fights = (Array.isArray(payload.fights) ? payload.fights : []).map((fight, index) => {
    const maxRound = fight?.maxRound === 5 ? 5 : 3;
    const redCorner = normalizeFantasyAdminCorner(fight?.redCorner, `red-${index + 1}`);
    const blueCorner = normalizeFantasyAdminCorner(fight?.blueCorner, `blue-${index + 1}`);

    if (redCorner.originalId === blueCorner.originalId) {
      throw new FantasyAdminEventSaveValidationError(
        "Cada luta precisa ter dois atletas diferentes."
      );
    }

    return {
      id: isUuid(fight?.id) ? fight.id : null,
      order: index + 1,
      label: ensureFantasyAdminText(
        normalizeFantasyAdminText(fight?.label),
        "Categoria da luta",
        2
      ),
      maxRound,
      redCorner,
      blueCorner,
      result: normalizeFantasyAdminFightResult(
        { ...fight, maxRound },
        redCorner.originalId,
        blueCorner.originalId
      )
    };
  });

  return {
    id: isUuid(payload.id) ? payload.id : null,
    slug,
    name,
    status: payload.status,
    startsAt,
    lockAt,
    venue: ensureFantasyAdminText(
      normalizeFantasyAdminText(payload.venue),
      "Venue",
      2
    ),
    cityName: city.cityName,
    stateCode: city.stateCode,
    heroLabel:
      normalizeFantasyAdminText(payload.heroLabel) || "Fantasy oficial do card",
    broadcastLabel:
      normalizeFantasyAdminText(payload.broadcastLabel) || "Canal Money Moicano",
    statusText: normalizeFantasyAdminText(payload.statusText),
    scoringRules: normalizeFantasyAdminScoringRules(payload.scoringRules),
    fights
  };
}

async function ensureFantasyAdminScoringProfile(client, scoringRules, actorAccountId) {
  const existingProfileResult = await client.query(
    `
      select id
      from app.fantasy_scoring_profiles
      where winner_points = $1
        and method_points = $2
        and round_points = $3
        and perfect_pick_bonus = $4
      order by is_default desc, created_at asc
      limit 1
    `,
    [
      scoringRules.winner,
      scoringRules.method,
      scoringRules.round,
      scoringRules.perfectPickBonus
    ]
  );

  const existingProfileId = existingProfileResult.rows[0]?.id;

  if (existingProfileId) {
    return existingProfileId;
  }

  const profileName = `Fantasy ${scoringRules.winner}-${scoringRules.method}-${scoringRules.round}-${scoringRules.perfectPickBonus}`;
  const insertResult = await client.query(
    `
      insert into app.fantasy_scoring_profiles (
        name,
        description,
        winner_points,
        method_points,
        round_points,
        perfect_pick_bonus,
        is_default,
        created_by_account_id
      )
      values ($1, $2, $3, $4, $5, $6, false, $7::uuid)
      on conflict (name) do update
      set
        description = excluded.description,
        winner_points = excluded.winner_points,
        method_points = excluded.method_points,
        round_points = excluded.round_points,
        perfect_pick_bonus = excluded.perfect_pick_bonus,
        updated_at = now()
      returning id
    `,
    [
      profileName,
      "Perfil criado pelo editor administrativo do fantasy.",
      scoringRules.winner,
      scoringRules.method,
      scoringRules.round,
      scoringRules.perfectPickBonus,
      actorAccountId
    ]
  );

  return insertResult.rows[0].id;
}

async function upsertFantasyAdminCorner(client, eventId, corner) {
  if (corner.id) {
    const existingCornerResult = await client.query(
      `
        select
          ef.id,
          ef.fighter_id as "fighterId"
        from app.event_fighters ef
        where ef.id = $1::uuid
          and ef.event_id = $2::uuid
        limit 1
      `,
      [corner.id, eventId]
    );
    const existingCorner = existingCornerResult.rows[0];

    if (existingCorner) {
      await client.query(
        `
          update app.event_fighters
          set
            card_name = $2,
            updated_at = now()
          where id = $1::uuid
        `,
        [existingCorner.id, corner.name]
      );

      await client.query(
        `
          update app.fighters
          set
            country_name = $2,
            updated_at = now()
          where id = $1::uuid
        `,
        [existingCorner.fighterId, corner.country]
      );

      return existingCorner.id;
    }
  }

  const fighterId = randomUUID();
  const fighterSlug = `${normalizeFantasyAdminSlug(corner.name, "fighter") || "fighter"}-${fighterId.slice(0, 8)}`;
  const eventFighterId = randomUUID();

  await client.query(
    `
      insert into app.fighters (
        id,
        slug,
        display_name,
        country_name,
        image_url,
        is_active
      )
      values ($1::uuid, $2, $3, $4, null, true)
    `,
    [fighterId, fighterSlug, corner.name, corner.country]
  );

  await client.query(
    `
      insert into app.event_fighters (
        id,
        event_id,
        fighter_id,
        card_name
      )
      values ($1::uuid, $2::uuid, $3::uuid, $4)
    `,
    [eventFighterId, eventId, fighterId, corner.name]
  );

  return eventFighterId;
}

async function saveFantasyAdminEventPayload(payload, actor, requestContext) {
  const normalizedEvent = normalizeFantasyAdminEventPayload(payload);
  const actorAccountId = isUuid(actor?.accountId) ? actor.accountId : null;
  const eventId = await withDatabaseTransaction(
    {
      actorId: actorAccountId,
      actorRole:
        actor?.role === "operator" || actor?.role === "admin" ? actor.role : "admin",
      actorEmail: normalizeEmail(actor?.email) || null,
      requestId: normalizeFantasyAdminText(requestContext?.requestId) || randomUUID(),
      clientIp: normalizeNullableText(requestContext?.clientIp),
      origin: normalizeNullableText(requestContext?.requestOrigin),
      userAgent: normalizeNullableText(requestContext?.userAgent),
      requestIpHash: normalizeNullableText(requestContext?.requestIpHash)
    },
    async (client) => {
      const scoringProfileId = await ensureFantasyAdminScoringProfile(
        client,
        normalizedEvent.scoringRules,
        actorAccountId
      );
      const existingEventResult = normalizedEvent.id
        ? await client.query(
            `
              select
                id,
                published_at as "publishedAt",
                finished_at as "finishedAt"
              from app.events
              where id = $1::uuid
              limit 1
            `,
            [normalizedEvent.id]
          )
        : { rows: [] };
      const existingEvent = existingEventResult.rows[0] ?? null;
      const persistedEventId = existingEvent?.id ?? normalizedEvent.id ?? randomUUID();
      const publishedAt =
        normalizedEvent.status === "draft"
          ? null
          : existingEvent?.publishedAt ?? new Date().toISOString();
      const finishedAt =
        normalizedEvent.status === "finished"
          ? existingEvent?.finishedAt ?? new Date().toISOString()
          : null;

      await client.query(
        `
          insert into app.events (
            id,
            slug,
            name,
            status,
            starts_at,
            lock_at,
            venue_name,
            city_name,
            state_code,
            hero_label,
            broadcast_label,
            status_text,
            published_at,
            finished_at,
            scoring_profile_id,
            created_by_account_id,
            updated_by_account_id
          )
          values (
            $1::uuid,
            $2,
            $3,
            $4::app.event_status_enum,
            $5,
            $6,
            $7,
            $8,
            $9::char(2),
            $10,
            $11,
            $12,
            $13,
            $14,
            $15::uuid,
            $16::uuid,
            $17::uuid
          )
          on conflict (id) do update
          set
            slug = excluded.slug,
            name = excluded.name,
            status = excluded.status,
            starts_at = excluded.starts_at,
            lock_at = excluded.lock_at,
            venue_name = excluded.venue_name,
            city_name = excluded.city_name,
            state_code = excluded.state_code,
            hero_label = excluded.hero_label,
            broadcast_label = excluded.broadcast_label,
            status_text = excluded.status_text,
            published_at = excluded.published_at,
            finished_at = excluded.finished_at,
            scoring_profile_id = excluded.scoring_profile_id,
            updated_by_account_id = excluded.updated_by_account_id,
            updated_at = now()
        `,
        [
          persistedEventId,
          normalizedEvent.slug,
          normalizedEvent.name,
          normalizedEvent.status,
          normalizedEvent.startsAt,
          normalizedEvent.lockAt,
          normalizedEvent.venue,
          normalizedEvent.cityName,
          normalizedEvent.stateCode,
          normalizedEvent.heroLabel,
          normalizedEvent.broadcastLabel,
          normalizedEvent.statusText,
          publishedAt,
          finishedAt,
          scoringProfileId,
          actorAccountId,
          actorAccountId
        ]
      );

      const persistedFightIds = [];

      for (const fight of normalizedEvent.fights) {
        const redCornerEventFighterId = await upsertFantasyAdminCorner(
          client,
          persistedEventId,
          fight.redCorner
        );
        const blueCornerEventFighterId = await upsertFantasyAdminCorner(
          client,
          persistedEventId,
          fight.blueCorner
        );

        if (redCornerEventFighterId === blueCornerEventFighterId) {
          throw new FantasyAdminEventSaveValidationError(
            "Uma luta não pode usar o mesmo atleta nos dois corners."
          );
        }

        const existingFightResult = fight.id
          ? await client.query(
              `
                select id
                from app.fights
                where id = $1::uuid
                  and event_id = $2::uuid
                limit 1
              `,
              [fight.id, persistedEventId]
            )
          : { rows: [] };
        const fightId = existingFightResult.rows[0]?.id ?? fight.id ?? randomUUID();
        const winnerEventFighterId =
          fight.result?.winnerSide === "red"
            ? redCornerEventFighterId
            : fight.result?.winnerSide === "blue"
              ? blueCornerEventFighterId
              : null;

        await client.query(
          `
            insert into app.fights (
              id,
              event_id,
              display_order,
              label,
              max_rounds,
              red_corner_event_fighter_id,
              blue_corner_event_fighter_id
            )
            values (
              $1::uuid,
              $2::uuid,
              $3,
              $4,
              $5,
              $6::uuid,
              $7::uuid
            )
            on conflict (id) do update
            set
              event_id = excluded.event_id,
              display_order = excluded.display_order,
              label = excluded.label,
              max_rounds = excluded.max_rounds,
              red_corner_event_fighter_id = excluded.red_corner_event_fighter_id,
              blue_corner_event_fighter_id = excluded.blue_corner_event_fighter_id,
              updated_at = now()
          `,
          [
            fightId,
            persistedEventId,
            fight.order,
            fight.label,
            fight.maxRound,
            redCornerEventFighterId,
            blueCornerEventFighterId
          ]
        );

        if (fight.result && winnerEventFighterId) {
          await client.query(
            `
              insert into app.fight_results (
                fight_id,
                winner_event_fighter_id,
                victory_method,
                official_round,
                decided_by_account_id
              )
              values (
                $1::uuid,
                $2::uuid,
                $3::app.victory_method_enum,
                $4,
                $5::uuid
              )
              on conflict (fight_id) do update
              set
                winner_event_fighter_id = excluded.winner_event_fighter_id,
                victory_method = excluded.victory_method,
                official_round = excluded.official_round,
                decided_by_account_id = excluded.decided_by_account_id,
                decided_at = now(),
                updated_at = now()
            `,
            [
              fightId,
              winnerEventFighterId,
              fight.result.victoryMethod,
              fight.result.round,
              actorAccountId
            ]
          );
        } else {
          await client.query("delete from app.fight_results where fight_id = $1::uuid", [fightId]);
        }

        persistedFightIds.push(fightId);
      }

      if (persistedFightIds.length) {
        await client.query(
          `
            delete from app.fights
            where event_id = $1::uuid
              and not (id = any($2::uuid[]))
          `,
          [persistedEventId, persistedFightIds]
        );
      } else {
        await client.query("delete from app.fights where event_id = $1::uuid", [persistedEventId]);
      }

      await client.query(
        `
          delete from app.event_fighters ef
          where ef.event_id = $1::uuid
            and not exists (
              select 1
              from app.fights fight
              where fight.red_corner_event_fighter_id = ef.id
                 or fight.blue_corner_event_fighter_id = ef.id
            )
        `,
        [persistedEventId]
      );

      return persistedEventId;
    }
  );

  const payloadAfterSave = await loadFantasyEventsPayload(eventId);
  const eventAfterSave = payloadAfterSave.events.find((event) => event.id === eventId) ?? null;

  if (!eventAfterSave) {
    return null;
  }

  return {
    ok: true,
    message: "Evento salvo no banco com sucesso.",
    event: eventAfterSave
  };
}

async function loadFantasyEventsPayload(targetEventId = null) {
  const eventResult = await getDatabasePool().query(
    `
      select
        e.id,
        e.slug,
        e.name,
        e.status,
        e.starts_at as "startsAt",
        e.lock_at as "lockAt",
        e.venue_name as venue,
        e.city_name as "cityName",
        e.state_code as "stateCode",
        e.hero_label as "heroLabel",
        e.broadcast_label as "broadcastLabel",
        e.status_text as "statusText",
        sp.winner_points as "winnerPoints",
        sp.method_points as "methodPoints",
        sp.round_points as "roundPoints",
        sp.perfect_pick_bonus as "perfectPickBonus"
      from app.events e
      join app.fantasy_scoring_profiles sp
        on sp.id = e.scoring_profile_id
      where e.status <> 'archived'
        and ($1::uuid is null or e.id = $1::uuid)
      order by e.starts_at desc, e.created_at desc
    `,
    [targetEventId]
  );

  if (!eventResult.rowCount) {
    return {
      events: []
    };
  }

  const eventIds = eventResult.rows.map((row) => row.id);
  const events = new Map();

  for (const row of eventResult.rows) {
    events.set(row.id, buildFantasyEventSkeleton(row));
  }

  const fightResult = await getDatabasePool().query(
    `
      select
        f.id,
        f.event_id as "eventId",
        f.display_order as "order",
        f.label,
        f.max_rounds as "maxRound",
        red_ef.id as "redCornerId",
        coalesce(red_ef.card_name, red_f.display_name) as "redCornerName",
        red_f.country_name as "redCornerCountry",
        red_f.image_url as "redCornerImageUrl",
        blue_ef.id as "blueCornerId",
        coalesce(blue_ef.card_name, blue_f.display_name) as "blueCornerName",
        blue_f.country_name as "blueCornerCountry",
        blue_f.image_url as "blueCornerImageUrl",
        fr.winner_event_fighter_id as "winnerId",
        fr.victory_method as "victoryMethod",
        fr.official_round as round
      from app.fights f
      join app.event_fighters red_ef
        on red_ef.id = f.red_corner_event_fighter_id
      join app.fighters red_f
        on red_f.id = red_ef.fighter_id
      join app.event_fighters blue_ef
        on blue_ef.id = f.blue_corner_event_fighter_id
      join app.fighters blue_f
        on blue_f.id = blue_ef.fighter_id
      left join app.fight_results fr
        on fr.fight_id = f.id
      where f.event_id = any($1::uuid[])
      order by f.event_id, f.display_order
    `,
    [eventIds]
  );

  for (const row of fightResult.rows) {
    const event = events.get(row.eventId);

    if (!event) {
      continue;
    }

    event.fights.push({
      id: row.id,
      order: row.order,
      label: row.label,
      maxRound: row.maxRound,
      redCorner: {
        id: row.redCornerId,
        name: row.redCornerName,
        country: row.redCornerCountry,
        imageUrl: row.redCornerImageUrl ?? ""
      },
      blueCorner: {
        id: row.blueCornerId,
        name: row.blueCornerName,
        country: row.blueCornerCountry,
        imageUrl: row.blueCornerImageUrl ?? ""
      },
      result: {
        winnerId: row.winnerId,
        victoryMethod: row.victoryMethod,
        round: row.round
      }
    });
  }

  const entryResult = await getDatabasePool().query(
    `
      select
        fe.id,
        fe.event_id as "eventId",
        fe.display_name as "displayName",
        fe.full_name as "fullName",
        fe.email,
        fe.whatsapp,
        fe.city,
        fe.state_code as "stateCode",
        fe.submitted_at as "submittedAt",
        fp.fight_id as "fightId",
        fp.picked_event_fighter_id as "fighterId",
        fp.predicted_victory_method as "victoryMethod",
        fp.predicted_round as round
      from app.fantasy_entries fe
      left join app.fantasy_picks fp
        on fp.fantasy_entry_id = fe.id
      where fe.event_id = any($1::uuid[])
      order by fe.event_id, fe.submitted_at, fp.fight_id
    `,
    [eventIds]
  );

  const entryMap = new Map();

  for (const row of entryResult.rows) {
    const event = events.get(row.eventId);

    if (!event) {
      continue;
    }

    let entry = entryMap.get(row.id);

    if (!entry) {
      entry = {
        id: row.id,
        displayName: row.displayName,
        fullName: row.fullName,
        email: row.email,
        whatsapp: row.whatsapp,
        city: row.city,
        state: mapFantasyEntryState(row.stateCode),
        marketingConsent: true,
        submittedAt: row.submittedAt,
        picks: []
      };
      entryMap.set(row.id, entry);
      event.entries.push(entry);
    }

    if (row.fightId && row.fighterId && row.victoryMethod && row.round) {
      entry.picks.push({
        fightId: row.fightId,
        fighterId: row.fighterId,
        victoryMethod: row.victoryMethod,
        round: row.round
      });
    }
  }

  return {
    events: eventResult.rows.map((row) => events.get(row.id)).filter(Boolean)
  };
}

async function handleFantasyEvents(event) {
  if (!assertBearerForScope(event, "admin_read")) {
    return buildJsonResponse(401, {
      ok: false,
      message: "Unauthorized."
    });
  }

  try {
    return buildJsonResponse(200, await loadFantasyEventsPayload());
  } catch (error) {
    console.error("fantasy events failed", { error });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handleAdminFantasyEvents(event) {
  if (!assertBearerForScope(event, "admin_write")) {
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

  const payload = getPayloadBody(body);
  const actor = body?.actor ?? {};
  const requestContext = body?.requestContext ?? {};

  try {
    const responsePayload = await saveFantasyAdminEventPayload(payload, actor, requestContext);

    if (!responsePayload) {
      return buildJsonResponse(503, {
        ok: false,
        message: "Serviço temporariamente indisponível."
      });
    }

    return buildJsonResponse(200, responsePayload);
  } catch (error) {
    if (error instanceof FantasyAdminEventSaveValidationError) {
      return buildJsonResponse(400, {
        ok: false,
        message: error.message
      });
    }

    console.error("admin fantasy save failed", { error });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function loadAdminContactMessagesTableData() {
  const table = ADMIN_DATABASE_TABLES["contact-messages"];
  const [summary, statusCounts, result] = await Promise.all([
    loadAdminTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.contact_messages
    `),
    loadAdminStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.contact_messages
      group by status
      order by count(*) desc, status asc
    `),
    getDatabasePool().query(`
      select
        id,
        created_at as "createdAt",
        full_name as "fullName",
        email,
        subject,
        status
      from app.contact_messages
      order by created_at desc
    `)
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "fullName", label: "Nome" },
      { key: "email", label: "Email" },
      { key: "subject", label: "Assunto" },
      { key: "status", label: "Status" }
    ],
    rows: result.rows.map((row) =>
      adminCreateRow(row.id, {
        createdAt: adminFormatDateTime(row.createdAt),
        fullName: adminFormatText(row.fullName),
        email: adminFormatText(row.email),
        subject: adminFormatText(row.subject),
        status: adminFormatStatus(row.status)
      })
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt
  };
}

async function loadAdminNewsletterSubscriptionsTableData() {
  const table = ADMIN_DATABASE_TABLES["newsletter-subscriptions"];
  const [summary, statusCounts, result] = await Promise.all([
    loadAdminTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.newsletter_subscriptions
    `),
    loadAdminStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.newsletter_subscriptions
      group by status
      order by count(*) desc, status asc
    `),
    getDatabasePool().query(`
      select
        id,
        subscribed_at as "subscribedAt",
        email,
        metadata ->> 'fullName' as "fullName",
        source,
        status
      from app.newsletter_subscriptions
      order by subscribed_at desc
    `)
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "subscribedAt", label: "Data" },
      { key: "email", label: "Email" },
      { key: "fullName", label: "Nome" },
      { key: "source", label: "Origem" },
      { key: "status", label: "Status" }
    ],
    rows: result.rows.map((row) =>
      adminCreateRow(row.id, {
        subscribedAt: adminFormatDateTime(row.subscribedAt),
        email: adminFormatText(row.email),
        fullName: adminFormatText(row.fullName),
        source: adminFormatSource(row.source),
        status: adminFormatStatus(row.status)
      })
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt
  };
}

async function loadAdminPartnerInquiriesTableData() {
  const table = ADMIN_DATABASE_TABLES["partner-inquiries"];
  const [summary, statusCounts, result] = await Promise.all([
    loadAdminTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.partner_inquiries
    `),
    loadAdminStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.partner_inquiries
      group by status
      order by count(*) desc, status asc
    `),
    getDatabasePool().query(`
      select
        id,
        created_at as "createdAt",
        company_name as "companyName",
        full_name as "fullName",
        email,
        status
      from app.partner_inquiries
      order by created_at desc
    `)
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "companyName", label: "Empresa" },
      { key: "fullName", label: "Contato" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" }
    ],
    rows: result.rows.map((row) =>
      adminCreateRow(row.id, {
        createdAt: adminFormatDateTime(row.createdAt),
        companyName: adminFormatText(row.companyName),
        fullName: adminFormatText(row.fullName),
        email: adminFormatText(row.email),
        status: adminFormatStatus(row.status)
      })
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt
  };
}

async function loadAdminFighterApplicationsTableData() {
  const table = ADMIN_DATABASE_TABLES["fighter-applications"];
  const [summary, statusCounts, result] = await Promise.all([
    loadAdminTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.fighter_applications
    `),
    loadAdminStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.fighter_applications
      group by status
      order by count(*) desc, status asc
    `),
    getDatabasePool().query(`
      select
        fa.id,
        fa.created_at as "createdAt",
        fa.full_name as "fullName",
        fa.nickname,
        fa.weight_class as "weightClass",
        fa.city,
        fa.state_code as "stateCode",
        contact.phone_whatsapp as "athleteWhatsapp",
        fa.status
      from app.fighter_applications fa
      left join app.fighter_application_contacts contact
        on contact.fighter_application_id = fa.id
       and contact.contact_role = 'athlete'
      order by fa.created_at desc
    `)
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "fighter", label: "Lutador" },
      { key: "weightClass", label: "Categoria" },
      { key: "location", label: "Cidade" },
      { key: "athleteWhatsapp", label: "WhatsApp" },
      { key: "status", label: "Status" }
    ],
    rows: result.rows.map((row) =>
      adminCreateRow(row.id, {
        createdAt: adminFormatDateTime(row.createdAt),
        fighter:
          [normalizeText(row.fullName), normalizeText(row.nickname)]
            .filter(Boolean)
            .join(" / ") || "—",
        weightClass: adminFormatWeightClass(row.weightClass),
        location: adminBuildLocation(row.city, row.stateCode),
        athleteWhatsapp: adminFormatText(row.athleteWhatsapp),
        status: adminFormatStatus(row.status)
      })
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt
  };
}

async function loadAdminEventFighterIntakesTableData() {
  const table = ADMIN_DATABASE_TABLES["event-fighter-intakes"];
  const [summary, statusCounts, result] = await Promise.all([
    loadAdminTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.event_fighter_intakes
    `),
    loadAdminStatusCounts(`
      select
        intake_status as status,
        count(*)::int as total
      from app.event_fighter_intakes
      group by intake_status
      order by count(*) desc, intake_status asc
    `),
    getDatabasePool().query(`
      select
        intake.id,
        intake.submitted_at as "submittedAt",
        intake.full_name as "fullName",
        intake.nickname,
        intake.email,
        intake.phone_whatsapp as "phoneWhatsapp",
        intake.intake_status as "intakeStatus",
        coalesce(photo_counts.total, 0)::int as "photoCount"
      from app.event_fighter_intakes intake
      left join lateral (
        select count(*)::int as total
        from app.event_fighter_intake_photos photo
        where photo.intake_id = intake.id
      ) photo_counts on true
      order by intake.submitted_at desc
    `)
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "submittedAt", label: "Enviado em" },
      { key: "fighter", label: "Atleta" },
      { key: "email", label: "Email" },
      { key: "phoneWhatsapp", label: "WhatsApp" },
      { key: "photoCount", label: "Fotos" },
      { key: "intakeStatus", label: "Status" }
    ],
    rows: result.rows.map((row) =>
      adminCreateRow(row.id, {
        submittedAt: adminFormatDateTime(row.submittedAt),
        fighter:
          [normalizeText(row.fullName), normalizeText(row.nickname)]
            .filter(Boolean)
            .join(" / ") || "—",
        email: adminFormatText(row.email),
        phoneWhatsapp: adminFormatText(row.phoneWhatsapp),
        photoCount: adminFormatPhotoCount(row.photoCount),
        intakeStatus: adminFormatStatus(row.intakeStatus)
      })
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt
  };
}

async function loadAdminFantasyEntriesTableData() {
  const table = ADMIN_DATABASE_TABLES["fantasy-entries"];
  const [summary, statusCounts, result] = await Promise.all([
    loadAdminTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.fantasy_entries
    `),
    loadAdminStatusCounts(`
      select
        entry_status as status,
        count(*)::int as total
      from app.fantasy_entries
      group by entry_status
      order by count(*) desc, entry_status asc
    `),
    getDatabasePool().query(`
      select
        entry.id,
        entry.submitted_at as "submittedAt",
        event.name as "eventName",
        entry.display_name as "displayName",
        entry.city,
        entry.state_code as "stateCode",
        entry.score_cached as "scoreCached",
        entry.entry_status as "entryStatus"
      from app.fantasy_entries entry
      join app.events event
        on event.id = entry.event_id
      order by entry.submitted_at desc
    `)
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "submittedAt", label: "Enviado em" },
      { key: "eventName", label: "Evento" },
      { key: "displayName", label: "Jogador" },
      { key: "location", label: "Cidade" },
      { key: "scoreCached", label: "Pontuação" },
      { key: "entryStatus", label: "Status" }
    ],
    rows: result.rows.map((row) =>
      adminCreateRow(row.id, {
        submittedAt: adminFormatDateTime(row.submittedAt),
        eventName: adminFormatText(row.eventName),
        displayName: adminFormatText(row.displayName),
        location: adminBuildLocation(row.city, row.stateCode),
        scoreCached: adminFormatScore(row.scoreCached),
        entryStatus: adminFormatStatus(row.entryStatus)
      })
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt
  };
}

async function loadAdminContactMessageRecord(rowId) {
  const table = ADMIN_DATABASE_TABLES["contact-messages"];
  const result = await getDatabasePool().query(
    `
      select
        message.id,
        message.full_name as "fullName",
        message.email,
        message.recipient_email as "recipientEmail",
        message.subject,
        message.message,
        message.source,
        message.status,
        message.responded_at as "respondedAt",
        message.reviewer_notes as "reviewerNotes",
        message.request_id as "requestId",
        message.request_origin as "requestOrigin",
        message.request_ip_hash as "requestIpHash",
        message.user_agent as "userAgent",
        message.metadata,
        message.created_at as "createdAt",
        message.updated_at as "updatedAt",
        assigned.display_name as "assignedDisplayName",
        assigned.email as "assignedEmail"
      from app.contact_messages message
      left join app.accounts assigned
        on assigned.id = message.assigned_account_id
      where message.id = $1::uuid
      limit 1
    `,
    [rowId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: adminFormatText(row.fullName),
    subtitle: adminFormatText(row.email),
    sections: [
      adminCreateSection("Emitente", [
        { label: "Nome", value: adminFormatText(row.fullName) },
        { label: "Email", value: adminFormatText(row.email) },
        { label: "Email destinatário", value: adminFormatText(row.recipientEmail) }
      ]),
      adminCreateSection("Mensagem", [
        { label: "Assunto", value: adminFormatText(row.subject) },
        { label: "Mensagem", value: adminFormatText(row.message) },
        { label: "Origem", value: adminFormatSource(row.source) },
        { label: "Status", value: adminFormatStatus(row.status) }
      ]),
      adminCreateSection("Operação", [
        {
          label: "Responsável",
          value: adminFormatAccountLabel(row.assignedDisplayName, row.assignedEmail)
        },
        { label: "Respondido em", value: adminFormatDateTime(row.respondedAt) },
        { label: "Notas internas", value: adminFormatText(row.reviewerNotes) }
      ]),
      adminCreateSection("Rastreamento", [
        { label: "Criado em", value: adminFormatDateTime(row.createdAt) },
        { label: "Atualizado em", value: adminFormatDateTime(row.updatedAt) },
        { label: "Request ID", value: adminFormatText(row.requestId) },
        { label: "Origem da request", value: adminFormatText(row.requestOrigin) },
        { label: "Hash do IP", value: adminFormatText(row.requestIpHash) },
        { label: "User agent", value: adminFormatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} }
      ])
    ]
  };
}

async function loadAdminNewsletterRecord(rowId) {
  const table = ADMIN_DATABASE_TABLES["newsletter-subscriptions"];
  const result = await getDatabasePool().query(
    `
      select
        id,
        email,
        source,
        status,
        request_id as "requestId",
        request_origin as "requestOrigin",
        request_ip_hash as "requestIpHash",
        user_agent as "userAgent",
        metadata,
        subscribed_at as "subscribedAt",
        updated_at as "updatedAt",
        unsubscribed_at as "unsubscribedAt"
      from app.newsletter_subscriptions
      where id = $1::uuid
      limit 1
    `,
    [rowId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: adminFormatText(row.email),
    subtitle: adminFormatStatus(row.status),
    sections: [
      adminCreateSection("Emitente", [
        { label: "Email", value: adminFormatText(row.email) },
        {
          label: "Nome informado",
          value: adminFormatText(
            row.metadata && typeof row.metadata.fullName === "string"
              ? row.metadata.fullName
              : null
          )
        },
        { label: "Origem", value: adminFormatSource(row.source) },
        { label: "Status", value: adminFormatStatus(row.status) }
      ]),
      adminCreateSection("Atividade", [
        { label: "Inscrito em", value: adminFormatDateTime(row.subscribedAt) },
        { label: "Atualizado em", value: adminFormatDateTime(row.updatedAt) },
        { label: "Descadastrado em", value: adminFormatDateTime(row.unsubscribedAt) }
      ]),
      adminCreateSection("Rastreamento", [
        { label: "Request ID", value: adminFormatText(row.requestId) },
        { label: "Origem da request", value: adminFormatText(row.requestOrigin) },
        { label: "Hash do IP", value: adminFormatText(row.requestIpHash) },
        { label: "User agent", value: adminFormatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} }
      ])
    ]
  };
}

async function loadAdminPartnerInquiryRecord(rowId) {
  const table = ADMIN_DATABASE_TABLES["partner-inquiries"];
  const result = await getDatabasePool().query(
    `
      select
        inquiry.id,
        inquiry.full_name as "fullName",
        inquiry.company_name as "companyName",
        inquiry.role_title as "roleTitle",
        inquiry.email,
        inquiry.phone,
        inquiry.company_profile as "companyProfile",
        inquiry.partnership_intent as "partnershipIntent",
        inquiry.source,
        inquiry.status,
        inquiry.last_contacted_at as "lastContactedAt",
        inquiry.reviewer_notes as "reviewerNotes",
        inquiry.request_id as "requestId",
        inquiry.request_origin as "requestOrigin",
        inquiry.request_ip_hash as "requestIpHash",
        inquiry.user_agent as "userAgent",
        inquiry.metadata,
        inquiry.created_at as "createdAt",
        inquiry.updated_at as "updatedAt",
        assigned.display_name as "assignedDisplayName",
        assigned.email as "assignedEmail"
      from app.partner_inquiries inquiry
      left join app.accounts assigned
        on assigned.id = inquiry.assigned_account_id
      where inquiry.id = $1::uuid
      limit 1
    `,
    [rowId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: adminFormatText(row.companyName),
    subtitle: adminFormatText(row.fullName),
    sections: [
      adminCreateSection("Emitente", [
        { label: "Contato", value: adminFormatText(row.fullName) },
        { label: "Empresa", value: adminFormatText(row.companyName) },
        { label: "Cargo", value: adminFormatText(row.roleTitle) },
        { label: "Email", value: adminFormatText(row.email) },
        { label: "Telefone", value: adminFormatText(row.phone) },
        { label: "Perfil da empresa", value: adminFormatText(row.companyProfile) }
      ]),
      adminCreateSection("Oportunidade", [
        { label: "Interesse", value: adminFormatText(row.partnershipIntent) },
        { label: "Origem", value: adminFormatSource(row.source) },
        { label: "Status", value: adminFormatStatus(row.status) },
        {
          label: "Responsável",
          value: adminFormatAccountLabel(row.assignedDisplayName, row.assignedEmail)
        },
        { label: "Último contato", value: adminFormatDateTime(row.lastContactedAt) },
        { label: "Notas internas", value: adminFormatText(row.reviewerNotes) }
      ]),
      adminCreateSection("Rastreamento", [
        { label: "Criado em", value: adminFormatDateTime(row.createdAt) },
        { label: "Atualizado em", value: adminFormatDateTime(row.updatedAt) },
        { label: "Request ID", value: adminFormatText(row.requestId) },
        { label: "Origem da request", value: adminFormatText(row.requestOrigin) },
        { label: "Hash do IP", value: adminFormatText(row.requestIpHash) },
        { label: "User agent", value: adminFormatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} }
      ])
    ]
  };
}

async function loadAdminFighterApplicationRecord(rowId) {
  const table = ADMIN_DATABASE_TABLES["fighter-applications"];
  const result = await getDatabasePool().query(
    `
      select
        application.id,
        application.full_name as "fullName",
        application.nickname,
        application.birth_date::text as "birthDate",
        application.city,
        application.state_code as "stateCode",
        application.team,
        application.weight_class as "weightClass",
        application.tapology_profile as "tapologyProfile",
        application.instagram_profile as "instagramProfile",
        application.specialty::text as specialty,
        application.specialty_other as "specialtyOther",
        application.competition_history as "competitionHistory",
        application.martial_arts_titles as "martialArtsTitles",
        application.curiosities,
        application.roast_consent as "roastConsent",
        application.source,
        application.status::text as status,
        application.reviewer_notes as "reviewerNotes",
        application.request_id as "requestId",
        application.request_origin as "requestOrigin",
        application.request_ip_hash as "requestIpHash",
        application.user_agent as "userAgent",
        application.metadata,
        application.created_at as "createdAt",
        application.updated_at as "updatedAt",
        assigned.display_name as "assignedDisplayName",
        assigned.email as "assignedEmail",
        contact_rows.contacts
      from app.fighter_applications application
      left join app.accounts assigned
        on assigned.id = application.assigned_account_id
      left join lateral (
        select
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'papel', contact.contact_role::text,
                'nome', contact.contact_name,
                'whatsapp', contact.phone_whatsapp
              )
              order by contact.contact_role::text
            ),
            '[]'::jsonb
          ) as contacts
        from app.fighter_application_contacts contact
        where contact.fighter_application_id = application.id
      ) contact_rows on true
      where application.id = $1::uuid
      limit 1
    `,
    [rowId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title:
      [adminFormatText(row.fullName), normalizeText(row.nickname)]
        .filter((value) => value !== "—")
        .join(" / ") || "Cadastro de lutador",
    subtitle: adminFormatStatus(row.status),
    sections: [
      adminCreateSection("Emitente", [
        { label: "Nome", value: adminFormatText(row.fullName) },
        { label: "Apelido", value: adminFormatText(row.nickname) },
        { label: "Data de nascimento", value: adminFormatText(row.birthDate) },
        { label: "Cidade", value: adminBuildLocation(row.city, row.stateCode) },
        { label: "Equipe", value: adminFormatText(row.team) },
        { label: "Categoria", value: adminFormatWeightClass(row.weightClass) }
      ]),
      adminCreateSection("Perfis e especialidade", [
        { label: "Tapology", value: adminFormatText(row.tapologyProfile) },
        { label: "Instagram", value: adminFormatText(row.instagramProfile) },
        { label: "Especialidade", value: adminHumanizeToken(row.specialty) },
        { label: "Especialidade livre", value: adminFormatText(row.specialtyOther) }
      ]),
      adminCreateSection("Histórico", [
        { label: "Histórico competitivo", value: adminFormatText(row.competitionHistory) },
        { label: "Títulos", value: adminFormatText(row.martialArtsTitles) },
        { label: "Curiosidades", value: adminFormatText(row.curiosities) },
        { label: "Autorizou roast", value: adminFormatBoolean(row.roastConsent) },
        { label: "Contatos enviados", value: row.contacts ?? [] }
      ]),
      adminCreateSection("Operação", [
        { label: "Origem", value: adminFormatSource(row.source) },
        { label: "Status", value: adminFormatStatus(row.status) },
        {
          label: "Responsável",
          value: adminFormatAccountLabel(row.assignedDisplayName, row.assignedEmail)
        },
        { label: "Notas internas", value: adminFormatText(row.reviewerNotes) }
      ]),
      adminCreateSection("Rastreamento", [
        { label: "Criado em", value: adminFormatDateTime(row.createdAt) },
        { label: "Atualizado em", value: adminFormatDateTime(row.updatedAt) },
        { label: "Request ID", value: adminFormatText(row.requestId) },
        { label: "Origem da request", value: adminFormatText(row.requestOrigin) },
        { label: "Hash do IP", value: adminFormatText(row.requestIpHash) },
        { label: "User agent", value: adminFormatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} }
      ])
    ]
  };
}

async function loadAdminFantasyEntryRecord(rowId) {
  const table = ADMIN_DATABASE_TABLES["fantasy-entries"];
  const result = await getDatabasePool().query(
    `
      select
        entry.id,
        entry.reference_code as "referenceCode",
        event.name as "eventName",
        entry.display_name as "displayName",
        entry.full_name as "fullName",
        entry.email,
        entry.whatsapp,
        entry.city,
        entry.state_code as "stateCode",
        entry.marketing_consent as "marketingConsent",
        entry.source,
        entry.entry_status as "entryStatus",
        entry.score_cached as "scoreCached",
        entry.perfect_picks_cached as "perfectPicksCached",
        entry.request_id as "requestId",
        entry.request_origin as "requestOrigin",
        entry.request_ip_hash as "requestIpHash",
        entry.user_agent as "userAgent",
        entry.metadata,
        entry.submitted_at as "submittedAt",
        entry.created_at as "createdAt",
        entry.updated_at as "updatedAt",
        pick_rows.picks
      from app.fantasy_entries entry
      join app.events event
        on event.id = entry.event_id
      left join lateral (
        select
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'ordem', fight.display_order,
                'luta', fight.label,
                'cornerVermelho', red_fighter.display_name,
                'cornerAzul', blue_fighter.display_name,
                'escolha', picked_fighter.display_name,
                'metodo', pick.predicted_victory_method::text,
                'round', pick.predicted_round
              )
              order by fight.display_order
            ),
            '[]'::jsonb
          ) as picks
        from app.fantasy_picks pick
        join app.fights fight
          on fight.id = pick.fight_id
        join app.event_fighters red_corner
          on red_corner.id = fight.red_corner_event_fighter_id
        join app.fighters red_fighter
          on red_fighter.id = red_corner.fighter_id
        join app.event_fighters blue_corner
          on blue_corner.id = fight.blue_corner_event_fighter_id
        join app.fighters blue_fighter
          on blue_fighter.id = blue_corner.fighter_id
        join app.event_fighters picked_corner
          on picked_corner.id = pick.picked_event_fighter_id
        join app.fighters picked_fighter
          on picked_fighter.id = picked_corner.fighter_id
        where pick.fantasy_entry_id = entry.id
      ) pick_rows on true
      where entry.id = $1::uuid
      limit 1
    `,
    [rowId]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: adminFormatText(row.displayName),
    subtitle: adminFormatText(row.eventName),
    sections: [
      adminCreateSection("Emitente", [
        { label: "Nome público", value: adminFormatText(row.displayName) },
        { label: "Nome completo", value: adminFormatText(row.fullName) },
        { label: "Email", value: adminFormatText(row.email) },
        { label: "WhatsApp", value: adminFormatText(row.whatsapp) },
        { label: "Cidade", value: adminBuildLocation(row.city, row.stateCode) },
        { label: "Consentimento marketing", value: adminFormatBoolean(row.marketingConsent) }
      ]),
      adminCreateSection("Fantasy", [
        { label: "Evento", value: adminFormatText(row.eventName) },
        { label: "Código de referência", value: adminFormatText(row.referenceCode) },
        { label: "Status", value: adminFormatStatus(row.entryStatus) },
        { label: "Pontuação", value: adminFormatScore(row.scoreCached) },
        {
          label: "Perfect picks",
          value: `${ADMIN_NUMBER_FORMATTER.format(adminParseCount(row.perfectPicksCached))} acertos perfeitos`
        },
        { label: "Origem", value: adminFormatSource(row.source) },
        { label: "Picks", value: row.picks ?? [] }
      ]),
      adminCreateSection("Rastreamento", [
        { label: "Enviado em", value: adminFormatDateTime(row.submittedAt) },
        { label: "Criado em", value: adminFormatDateTime(row.createdAt) },
        { label: "Atualizado em", value: adminFormatDateTime(row.updatedAt) },
        { label: "Request ID", value: adminFormatText(row.requestId) },
        { label: "Origem da request", value: adminFormatText(row.requestOrigin) },
        { label: "Hash do IP", value: adminFormatText(row.requestIpHash) },
        { label: "User agent", value: adminFormatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} }
      ])
    ]
  };
}

async function loadAdminEventFighterIntakeRecord(rowId) {
  const table = ADMIN_DATABASE_TABLES["event-fighter-intakes"];
  const result = await withDatabaseTransaction(
    {
      actorRole: "service",
      requestId: `admin-database-record-${rowId}`
    },
    async (client) =>
      client.query(
        `
          select
            intake.id,
            event.name as "eventName",
            fighter.display_name as "fighterName",
            intake.full_name as "fullName",
            intake.nickname,
            intake.email,
            intake.phone_whatsapp as "phoneWhatsapp",
            intake.birth_date::text as "birthDate",
            app.decrypt_secret(intake.cpf_ciphertext) as cpf,
            intake.cpf_last4 as "cpfLast4",
            intake.pix_key_type::text as "pixKeyType",
            app.decrypt_secret(intake.pix_key_ciphertext) as "pixKey",
            intake.pix_key_last4 as "pixKeyLast4",
            intake.has_health_insurance as "hasHealthInsurance",
            intake.health_insurance_provider as "healthInsuranceProvider",
            intake.record_summary as "recordSummary",
            intake.category,
            intake.height,
            intake.reach,
            intake.city,
            intake.education_level as "educationLevel",
            intake.team,
            intake.fight_graduations as "fightGraduations",
            intake.tapology_profile as "tapologyProfile",
            intake.instagram_profile as "instagramProfile",
            intake.coach_contact as "coachContact",
            intake.manager_contact as "managerContact",
            intake.corner_one_name as "cornerOneName",
            intake.corner_two_name as "cornerTwoName",
            intake.primary_specialty as "primarySpecialty",
            intake.additional_specialties as "additionalSpecialties",
            intake.competition_history as "competitionHistory",
            intake.titles_won as "titlesWon",
            intake.life_story as "lifeStory",
            intake.funny_story as "funnyStory",
            intake.curiosities,
            intake.hobbies,
            intake.source,
            intake.intake_status as "intakeStatus",
            intake.reviewed_at as "reviewedAt",
            intake.staff_notes as "staffNotes",
            intake.request_id as "requestId",
            intake.request_origin as "requestOrigin",
            intake.request_ip_hash as "requestIpHash",
            intake.user_agent as "userAgent",
            intake.metadata,
            intake.submitted_at as "submittedAt",
            intake.created_at as "createdAt",
            intake.updated_at as "updatedAt",
            submitted_by.display_name as "submittedByDisplayName",
            submitted_by.email as "submittedByEmail",
            reviewed_by.display_name as "reviewedByDisplayName",
            reviewed_by.email as "reviewedByEmail",
            photo_rows.photos
          from app.event_fighter_intakes intake
          left join app.event_fighters event_fighter
            on event_fighter.id = intake.event_fighter_id
          left join app.events event
            on event.id = event_fighter.event_id
          left join app.fighters fighter
            on fighter.id = event_fighter.fighter_id
          left join app.accounts submitted_by
            on submitted_by.id = intake.submitted_by_account_id
          left join app.accounts reviewed_by
            on reviewed_by.id = intake.reviewed_by_account_id
          left join lateral (
            select
              coalesce(
                jsonb_agg(
                  jsonb_build_object(
                    'campo', photo.field_name::text,
                    'arquivo', photo.original_file_name,
                    'bucket', photo.storage_bucket,
                    'objectKey', photo.object_key,
                    'contentType', photo.content_type,
                    'tamanhoBytes', photo.byte_size,
                    'provider', photo.storage_provider,
                    'criadoEm', to_char(photo.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                  )
                  order by photo.field_name::text
                ),
                '[]'::jsonb
              ) as photos
            from app.event_fighter_intake_photos photo
            where photo.intake_id = intake.id
          ) photo_rows on true
          where intake.id = $1::uuid
          limit 1
        `,
        [rowId]
      ),
    {
      requiresEncryptionKey: true
    }
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const photos = Array.isArray(row.photos)
    ? row.photos.map((photo) => {
        if (!photo || typeof photo !== "object" || Array.isArray(photo)) {
          return photo;
        }

        return {
          ...photo,
          campo: adminHumanizeToken(typeof photo.campo === "string" ? photo.campo : null)
        };
      })
    : row.photos ?? [];

  return {
    databaseConfigured: true,
    table,
    rowId,
    title:
      [adminFormatText(row.fullName), normalizeText(row.nickname)]
        .filter((value) => value !== "—")
        .join(" / ") || "Intake de evento",
    subtitle: adminFormatText(row.eventName || row.fighterName),
    sections: [
      adminCreateSection("Emitente", [
        { label: "Evento", value: adminFormatText(row.eventName) },
        { label: "Lutador vinculado", value: adminFormatText(row.fighterName) },
        { label: "Nome", value: adminFormatText(row.fullName) },
        { label: "Apelido", value: adminFormatText(row.nickname) },
        { label: "Email", value: adminFormatText(row.email) },
        { label: "WhatsApp", value: adminFormatText(row.phoneWhatsapp) },
        { label: "Nascimento", value: adminFormatText(row.birthDate) },
        { label: "Cidade", value: adminFormatText(row.city) }
      ]),
      adminCreateSection("Documento e pagamento", [
        { label: "CPF", value: adminFormatText(row.cpf) },
        { label: "CPF final", value: adminFormatText(row.cpfLast4) },
        { label: "Tipo de chave PIX", value: adminHumanizeToken(row.pixKeyType) },
        { label: "Chave PIX", value: adminFormatText(row.pixKey) },
        { label: "PIX final", value: adminFormatText(row.pixKeyLast4) }
      ]),
      adminCreateSection("Perfil esportivo", [
        { label: "Cartel", value: adminFormatText(row.recordSummary) },
        { label: "Categoria", value: adminFormatText(row.category) },
        { label: "Altura", value: adminFormatText(row.height) },
        { label: "Envergadura", value: adminFormatText(row.reach) },
        { label: "Escolaridade", value: adminFormatText(row.educationLevel) },
        { label: "Equipe", value: adminFormatText(row.team) },
        { label: "Graduações", value: adminFormatText(row.fightGraduations) },
        { label: "Tapology", value: adminFormatText(row.tapologyProfile) },
        { label: "Instagram", value: adminFormatText(row.instagramProfile) },
        { label: "Especialidade principal", value: adminFormatText(row.primarySpecialty) },
        { label: "Especialidades adicionais", value: adminFormatText(row.additionalSpecialties) }
      ]),
      adminCreateSection("Equipe e operação", [
        { label: "Contato do coach", value: adminFormatText(row.coachContact) },
        { label: "Contato do manager", value: adminFormatText(row.managerContact) },
        { label: "Corner 1", value: adminFormatText(row.cornerOneName) },
        { label: "Corner 2", value: adminFormatText(row.cornerTwoName) },
        { label: "Tem plano de saúde", value: adminFormatBoolean(row.hasHealthInsurance) },
        { label: "Plano de saúde", value: adminFormatText(row.healthInsuranceProvider) },
        { label: "Status", value: adminFormatStatus(row.intakeStatus) },
        {
          label: "Enviado por",
          value: adminFormatAccountLabel(row.submittedByDisplayName, row.submittedByEmail)
        },
        {
          label: "Revisado por",
          value: adminFormatAccountLabel(row.reviewedByDisplayName, row.reviewedByEmail)
        },
        { label: "Revisado em", value: adminFormatDateTime(row.reviewedAt) },
        { label: "Notas internas", value: adminFormatText(row.staffNotes) }
      ]),
      adminCreateSection("Narrativas", [
        { label: "Histórico competitivo", value: adminFormatText(row.competitionHistory) },
        { label: "Títulos", value: adminFormatText(row.titlesWon) },
        { label: "História de vida", value: adminFormatText(row.lifeStory) },
        { label: "História engraçada", value: adminFormatText(row.funnyStory) },
        { label: "Curiosidades", value: adminFormatText(row.curiosities) },
        { label: "Hobbies", value: adminFormatText(row.hobbies) }
      ]),
      adminCreateSection("Assets", [{ label: "Fotos enviadas", value: photos }]),
      adminCreateSection("Rastreamento", [
        { label: "Origem", value: adminFormatSource(row.source) },
        { label: "Enviado em", value: adminFormatDateTime(row.submittedAt) },
        { label: "Criado em", value: adminFormatDateTime(row.createdAt) },
        { label: "Atualizado em", value: adminFormatDateTime(row.updatedAt) },
        { label: "Request ID", value: adminFormatText(row.requestId) },
        { label: "Origem da request", value: adminFormatText(row.requestOrigin) },
        { label: "Hash do IP", value: adminFormatText(row.requestIpHash) },
        { label: "User agent", value: adminFormatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} }
      ])
    ]
  };
}

async function loadAdminDatabaseTableData(tableId) {
  switch (tableId) {
    case "contact-messages":
      return loadAdminContactMessagesTableData();
    case "newsletter-subscriptions":
      return loadAdminNewsletterSubscriptionsTableData();
    case "partner-inquiries":
      return loadAdminPartnerInquiriesTableData();
    case "fighter-applications":
      return loadAdminFighterApplicationsTableData();
    case "event-fighter-intakes":
      return loadAdminEventFighterIntakesTableData();
    case "fantasy-entries":
      return loadAdminFantasyEntriesTableData();
    default:
      return null;
  }
}

async function loadAdminDatabaseRecordData(tableId, rowId) {
  switch (tableId) {
    case "contact-messages":
      return loadAdminContactMessageRecord(rowId);
    case "newsletter-subscriptions":
      return loadAdminNewsletterRecord(rowId);
    case "partner-inquiries":
      return loadAdminPartnerInquiryRecord(rowId);
    case "fighter-applications":
      return loadAdminFighterApplicationRecord(rowId);
    case "event-fighter-intakes":
      return loadAdminEventFighterIntakeRecord(rowId);
    case "fantasy-entries":
      return loadAdminFantasyEntryRecord(rowId);
    default:
      return null;
  }
}

async function handleAdminDatabaseTable(event, tableId) {
  if (!assertBearerForScope(event, "admin_read")) {
    return buildJsonResponse(401, {
      ok: false,
      message: "Unauthorized."
    });
  }

  if (!ADMIN_DATABASE_TABLES[tableId]) {
    return buildNotFoundResponse();
  }

  try {
    const payload = await loadAdminDatabaseTableData(tableId);

    if (!payload) {
      return buildNotFoundResponse();
    }

    return buildJsonResponse(200, payload);
  } catch (error) {
    console.error("admin database table failed", { error, tableId });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handleAdminDatabaseRecord(event, tableId, rowId) {
  if (!assertBearerForScope(event, "admin_read")) {
    return buildJsonResponse(401, {
      ok: false,
      message: "Unauthorized."
    });
  }

  if (!ADMIN_DATABASE_TABLES[tableId]) {
    return buildNotFoundResponse();
  }

  try {
    const payload = await loadAdminDatabaseRecordData(tableId, rowId);

    if (!payload) {
      return buildNotFoundResponse();
    }

    return buildJsonResponse(200, payload);
  } catch (error) {
    console.error("admin database record failed", { error, tableId, rowId });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handleGoogleSheetsExportTable(event, exportKey) {
  const exportConfig = GOOGLE_SHEETS_EXPORTS[exportKey];

  if (!exportConfig) {
    return buildNotFoundResponse();
  }

  if (!assertGoogleSheetsExportBearer(event, exportConfig)) {
    return buildJsonResponse(401, {
      ok: false,
      message: "Unauthorized."
    });
  }

  const limit = parsePositiveInteger(event.queryStringParameters?.limit, 1000, 1000);
  const offset = parsePositiveInteger(event.queryStringParameters?.offset, 0);

  try {
    const payload = await loadGoogleSheetsExportPage(exportConfig, {
      limit,
      offset
    });

    return buildJsonResponse(200, {
      ok: true,
      export: payload
    });
  } catch (error) {
    console.error("google sheets export failed", { error, exportKey, limit, offset });

    return buildJsonResponse(503, {
      ok: false,
      message: "Serviço temporariamente indisponível."
    });
  }
}

async function handleEventFighterAccess(event) {
  if (!assertBearerForScope(event, "portal")) {
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
  if (!assertBearerForScope(event, "public_write")) {
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
  if (!assertBearerForScope(event, "public_write")) {
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
  if (!assertBearerForScope(event, "public_write")) {
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
  if (!assertBearerForScope(event, "public_write")) {
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
  if (!assertBearerForScope(event, "public_write")) {
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

function buildEventFighterIntakeMetadata(payload, accessEmail, extras = {}) {
  return JSON.stringify({
    surface: "event-fighter-intake-lambda",
    accessEmail,
    ...extras
  });
}

async function handleEventFighterIntake(event) {
  if (!assertBearerForScope(event, "portal")) {
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
  const stateCode = getBrazilianStateCode(payload?.state);

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

  if (!stateCode) {
    return buildJsonResponse(400, {
      ok: false,
      message: "Estado invalido."
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
        const metadata = buildEventFighterIntakeMetadata(payload, accessEmail, {
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
                category = $17,
                height = $18,
                reach = $19,
                city = $20,
                state_code = $21,
                education_level = $22,
                team = $23,
                coach_name = $24,
                fight_graduations = $25,
                tapology_profile = $26,
                instagram_profile = $27,
                coach_contact = $28,
                manager_name = $29,
                manager_contact = $30,
                corner_one_name = $31,
                corner_two_name = $32,
                primary_specialty = $33,
                additional_specialties = $34,
                competition_history = $35,
                titles_won = $36,
                life_story = $37,
                funny_story = $38,
                curiosities = $39,
                hobbies = $40,
                source = $41,
                intake_status = 'submitted',
                reviewed_by_account_id = null,
                reviewed_at = null,
                staff_notes = null,
                request_id = $42,
                request_origin = $43,
                request_ip_hash = $44,
                user_agent = $45,
                metadata = app.event_fighter_intakes.metadata || $46::jsonb,
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
              payload.category,
              payload.height,
              payload.reach,
              payload.city,
              stateCode,
              payload.education,
              payload.team,
              payload.coachName,
              payload.fightGraduations,
              payload.tapologyLink,
              payload.instagramLink,
              payload.coachContact,
              payload.managerName || null,
              payload.managerContact || null,
              payload.cornerOne,
              payload.cornerTwo || null,
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
                category,
                height,
                reach,
                city,
                state_code,
                education_level,
                team,
                coach_name,
                fight_graduations,
                tapology_profile,
                instagram_profile,
                coach_contact,
                manager_name,
                manager_contact,
                corner_one_name,
                corner_two_name,
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
                $26,
                $27,
                $28,
                $29,
                $30,
                $31,
                $32,
                $33,
                $34,
                $35,
                $36,
                $37,
                $38,
                $39,
                $40,
                $41,
                'submitted',
                $42,
                $43,
                $44,
                $45,
                $46::jsonb,
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
              payload.category,
              payload.height,
              payload.reach,
              payload.city,
              stateCode,
              payload.education,
              payload.team,
              payload.coachName,
              payload.fightGraduations,
              payload.tapologyLink,
              payload.instagramLink,
              payload.coachContact,
              payload.managerName || null,
              payload.managerContact || null,
              payload.cornerOne,
              payload.cornerTwo || null,
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

    if (method === "GET" && rawPath === ADMIN_DATABASE_OVERVIEW_PATH) {
      return await handleAdminDatabaseOverview(event);
    }

    if (method === "GET" && rawPath === FANTASY_EVENTS_PATH) {
      return await handleFantasyEvents(event);
    }

    if (method === "GET" && rawPath.startsWith(`${ADMIN_DATABASE_ROUTE_BASE}/`)) {
      const routeSuffix = rawPath.slice(ADMIN_DATABASE_ROUTE_BASE.length + 1);
      const pathSegments = routeSuffix
        .split("/")
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (pathSegments.length === 1) {
        return await handleAdminDatabaseTable(
          event,
          decodeURIComponent(pathSegments[0])
        );
      }

      if (pathSegments.length === 2) {
        return await handleAdminDatabaseRecord(
          event,
          decodeURIComponent(pathSegments[0]),
          decodeURIComponent(pathSegments[1])
        );
      }
    }

    if (method === "GET" && rawPath.startsWith(`${GOOGLE_SHEETS_EXPORT_ROUTE_BASE}/`)) {
      const exportKey = rawPath.slice(GOOGLE_SHEETS_EXPORT_ROUTE_BASE.length + 1).trim();

      if (exportKey) {
        return await handleGoogleSheetsExportTable(event, decodeURIComponent(exportKey));
      }
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

    if (method === "POST" && rawPath === ADMIN_FANTASY_EVENTS_PATH) {
      return await handleAdminFantasyEvents(event);
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
