import "server-only";

import { queryDatabase, withDatabaseTransaction } from "@/lib/server/database";
import { getJsonFromUpstream, UpstreamApiError } from "@/lib/server/http";
import {
  getAdminReadUpstreamBearerToken,
  getServerEnv,
  isAdminReadUpstreamConfigured,
  isDatabaseConfigured,
  type ServerEnv,
} from "@/lib/server/env";

const TABLE_PREVIEW_LIMIT = 6;
const ADMIN_DATABASE_ROUTE_BASE = "/v1/admin/database";
const EVENT_FIGHTER_INTAKE_SOURCE = "money-moicano-atletas-da-edicao";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels: Record<string, string> = {
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
  voided: "Invalidado",
};

const sourceLabels: Record<string, string> = {
  contact_page: "Contato",
  fighter_application: "Cadastro de lutador",
  newsletter_signup: "Newsletter",
  partner_inquiry: "Parceria",
  press_newsletter: "Newsletter imprensa",
};

export type AdminDatabaseTableId =
  | "contact-messages"
  | "newsletter-subscriptions"
  | "partner-inquiries"
  | "fighter-applications"
  | "event-fighter-intakes"
  | "fantasy-entries";

export type AdminDatabaseTableMeta = {
  id: AdminDatabaseTableId;
  label: string;
  tableName: string;
  description: string;
  previewLabel: string;
};

const adminDatabaseTables: Record<AdminDatabaseTableId, AdminDatabaseTableMeta> = {
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

export const ALL_ADMIN_DATABASE_TABLE_IDS = Object.freeze(
  Object.keys(adminDatabaseTables) as AdminDatabaseTableId[],
);

export type AdminDatabaseLoadOptions = {
  visibleTableIds?: readonly AdminDatabaseTableId[];
  limitEventFighterIntakesToCurrentEvent?: boolean;
};

export type AdminDatabaseColumn = {
  key: string;
  label: string;
};

export type AdminDatabaseRow = {
  id: string;
  cells: Record<string, string>;
};

export type AdminDatabaseStatusCount = {
  label: string;
  value: number;
};

export type AdminDatabaseTablePreview = {
  id: string;
  label: string;
  tableName: string;
  description: string;
  previewLabel: string;
  columns: AdminDatabaseColumn[];
  rows: AdminDatabaseRow[];
  statusCounts: AdminDatabaseStatusCount[];
  totalRows: number | null;
  lastActivityAt: string | null;
  errorMessage?: string;
};

export type AdminDatabaseOverview = {
  databaseConfigured: boolean;
  totalRows: number;
  tables: AdminDatabaseTablePreview[];
  availableTables: number;
  unavailableTables: number;
};

export type AdminDatabaseRecordField = {
  label: string;
  value: unknown;
};

export type AdminDatabaseRecordSection = {
  title: string;
  fields: AdminDatabaseRecordField[];
};

export type AdminDatabaseRecordCopyExport = {
  id: string;
  label: string;
  description: string;
  content: string;
};

export type AdminDatabaseTableData = {
  databaseConfigured: boolean;
  table: AdminDatabaseTableMeta;
  columns: AdminDatabaseColumn[];
  rows: AdminDatabaseRow[];
  statusCounts: AdminDatabaseStatusCount[];
  totalRows: number;
  lastActivityAt: string | null;
  errorMessage?: string;
};

export type AdminDatabaseRecordData = {
  databaseConfigured: boolean;
  table: AdminDatabaseTableMeta;
  rowId: string;
  title: string;
  subtitle?: string | null;
  sections: AdminDatabaseRecordSection[];
  copyExports?: AdminDatabaseRecordCopyExport[];
  errorMessage?: string;
};

type DateValue = string | Date | null | undefined;

type ClipboardColumn<Row> = {
  key: string;
  pick: (row: Row) => unknown;
};

type EventFighterIntakeClipboardRow = {
  id: string;
  eventName: string | null;
  fighterName: string | null;
  eventFighterId: string | null;
  submittedByAccountId: string | null;
  fullName: string;
  nickname: string;
  email: string;
  phoneWhatsapp: string;
  birthDate: string;
  cpf: string | null;
  cpfLast4: string;
  pixKeyType: string;
  pixKey: string | null;
  pixKeyLast4: string;
  hasHealthInsurance: boolean;
  healthInsuranceProvider: string | null;
  recordSummary: string;
  category: string | null;
  height: string | null;
  reach: string | null;
  city: string | null;
  stateCode: string | null;
  educationLevel: string | null;
  team: string | null;
  coachName: string | null;
  fightGraduations: string | null;
  tapologyProfile: string | null;
  instagramProfile: string | null;
  coachContact: string | null;
  managerName: string | null;
  managerContact: string | null;
  cornerOneName: string | null;
  cornerTwoName: string | null;
  primarySpecialty: string;
  additionalSpecialties: string;
  competitionHistory: string;
  titlesWon: string;
  lifeStory: string;
  funnyStory: string;
  curiosities: string;
  hobbies: string;
  source: string;
  intakeStatus: string;
  reviewedByAccountId: string | null;
  reviewedAt: DateValue;
  staffNotes: string | null;
  requestId: string | null;
  requestOrigin: string | null;
  userAgent: string | null;
  metadata: unknown;
  submittedAt: DateValue;
  createdAt: DateValue;
  updatedAt: DateValue;
};

const EVENT_FIGHTER_FINANCE_CLIPBOARD_COLUMNS: ClipboardColumn<EventFighterIntakeClipboardRow>[] = [
  { key: "id", pick: (row) => row.id },
  { key: "event_name", pick: (row) => row.eventName },
  { key: "fighter_name", pick: (row) => row.fighterName },
  { key: "event_fighter_id", pick: (row) => row.eventFighterId },
  { key: "submitted_by_account_id", pick: (row) => row.submittedByAccountId },
  { key: "full_name", pick: (row) => row.fullName },
  { key: "nickname", pick: (row) => row.nickname },
  { key: "email", pick: (row) => row.email },
  { key: "phone_whatsapp", pick: (row) => row.phoneWhatsapp },
  { key: "birth_date", pick: (row) => row.birthDate },
  { key: "cpf", pick: (row) => row.cpf },
  { key: "cpf_last4", pick: (row) => row.cpfLast4 },
  { key: "pix_key_type", pick: (row) => row.pixKeyType },
  { key: "pix_key", pick: (row) => row.pixKey },
  { key: "pix_key_last4", pick: (row) => row.pixKeyLast4 },
  { key: "has_health_insurance", pick: (row) => row.hasHealthInsurance },
  { key: "health_insurance_provider", pick: (row) => row.healthInsuranceProvider },
  { key: "record_summary", pick: (row) => row.recordSummary },
  { key: "category", pick: (row) => row.category },
  { key: "height", pick: (row) => row.height },
  { key: "reach", pick: (row) => row.reach },
  { key: "city", pick: (row) => row.city },
  { key: "state_code", pick: (row) => row.stateCode },
  { key: "education_level", pick: (row) => row.educationLevel },
  { key: "team", pick: (row) => row.team },
  { key: "coach_name", pick: (row) => row.coachName },
  { key: "fight_graduations", pick: (row) => row.fightGraduations },
  { key: "coach_contact", pick: (row) => row.coachContact },
  { key: "manager_name", pick: (row) => row.managerName },
  { key: "manager_contact", pick: (row) => row.managerContact },
  { key: "corner_one_name", pick: (row) => row.cornerOneName },
  { key: "corner_two_name", pick: (row) => row.cornerTwoName },
  { key: "primary_specialty", pick: (row) => row.primarySpecialty },
  { key: "additional_specialties", pick: (row) => row.additionalSpecialties },
  { key: "competition_history", pick: (row) => row.competitionHistory },
  { key: "titles_won", pick: (row) => row.titlesWon },
  { key: "life_story", pick: (row) => row.lifeStory },
  { key: "funny_story", pick: (row) => row.funnyStory },
  { key: "curiosities", pick: (row) => row.curiosities },
  { key: "hobbies", pick: (row) => row.hobbies },
  { key: "tapology_profile", pick: (row) => row.tapologyProfile },
  { key: "instagram_profile", pick: (row) => row.instagramProfile },
  { key: "source", pick: (row) => row.source },
  { key: "intake_status", pick: (row) => row.intakeStatus },
  { key: "reviewed_by_account_id", pick: (row) => row.reviewedByAccountId },
  { key: "reviewed_at", pick: (row) => row.reviewedAt },
  { key: "staff_notes", pick: (row) => row.staffNotes },
  { key: "request_id", pick: (row) => row.requestId },
  { key: "request_origin", pick: (row) => row.requestOrigin },
  { key: "user_agent", pick: (row) => row.userAgent },
  { key: "metadata", pick: (row) => row.metadata },
  { key: "submitted_at", pick: (row) => row.submittedAt },
  { key: "created_at", pick: (row) => row.createdAt },
  { key: "updated_at", pick: (row) => row.updatedAt },
];

const EVENT_FIGHTER_NARRATIVES_CLIPBOARD_COLUMNS: ClipboardColumn<EventFighterIntakeClipboardRow>[] = [
  { key: "competition_history", pick: (row) => row.competitionHistory },
  { key: "titles_won", pick: (row) => row.titlesWon },
  { key: "life_story", pick: (row) => row.lifeStory },
  { key: "funny_story", pick: (row) => row.funnyStory },
  { key: "curiosities", pick: (row) => row.curiosities },
  { key: "hobbies", pick: (row) => row.hobbies },
];

type TableSummaryRow = {
  totalRows: number | string;
  lastActivityAt: DateValue;
};

type StatusBreakdownRow = {
  status: string;
  total: number | string;
};

type ContactMessagePreviewRow = {
  id: string;
  createdAt: DateValue;
  fullName: string;
  email: string;
  subject: string;
  status: string;
};

type NewsletterPreviewRow = {
  id: string;
  subscribedAt: DateValue;
  email: string;
  fullName: string | null;
  source: string;
  status: string;
};

type PartnerInquiryPreviewRow = {
  id: string;
  createdAt: DateValue;
  companyName: string;
  fullName: string;
  email: string;
  status: string;
};

type FighterApplicationPreviewRow = {
  id: string;
  createdAt: DateValue;
  fullName: string | null;
  nickname: string | null;
  weightClass: string | null;
  city: string | null;
  stateCode: string | null;
  athleteWhatsapp: string | null;
  status: string;
};

type EventFighterIntakePreviewRow = {
  id: string;
  submittedAt: DateValue;
  fullName: string;
  nickname: string;
  email: string;
  phoneWhatsapp: string;
  intakeStatus: string;
  photoCount: number | string;
};

type FantasyEntryPreviewRow = {
  id: string;
  submittedAt: DateValue;
  eventName: string;
  displayName: string;
  email: string;
  city: string;
  stateCode: string;
  scoreCached: number | string;
  entryStatus: string;
};

type TableFallbackConfig = Omit<
  AdminDatabaseTablePreview,
  "rows" | "statusCounts" | "totalRows" | "lastActivityAt" | "errorMessage"
>;

type EventFighterIntakeScope = {
  limitToCurrentEvent: boolean;
  currentEventId: string | null;
};

function getNormalizedVisibleTableIds(options?: AdminDatabaseLoadOptions) {
  if (!options?.visibleTableIds?.length) {
    return [...ALL_ADMIN_DATABASE_TABLE_IDS];
  }

  const allowedTableIds = new Set<AdminDatabaseTableId>();

  for (const tableId of options.visibleTableIds) {
    if (isAdminDatabaseTableId(tableId)) {
      allowedTableIds.add(tableId);
    }
  }

  return [...allowedTableIds];
}

function isTableAllowedByLoadOptions(
  tableId: AdminDatabaseTableId,
  options?: AdminDatabaseLoadOptions,
) {
  if (!options?.visibleTableIds?.length) {
    return true;
  }

  return options.visibleTableIds.includes(tableId);
}

function applyOverviewLoadOptions(
  overview: AdminDatabaseOverview,
  options?: AdminDatabaseLoadOptions,
): AdminDatabaseOverview {
  const visibleTableIds = new Set(getNormalizedVisibleTableIds(options));

  const tables = overview.tables
    .filter((table) => isAdminDatabaseTableId(table.id) && visibleTableIds.has(table.id))
    .map((table) => table);

  const availableTables = tables.filter((table) => !table.errorMessage).length;
  const unavailableTables = tables.length - availableTables;
  const totalRows = tables.reduce((sum, table) => sum + (table.totalRows ?? 0), 0);

  return {
    ...overview,
    totalRows,
    tables,
    availableTables,
    unavailableTables,
  };
}

async function resolveCurrentOperationalEventId() {
  const result = await queryDatabase<{ id: string }>(
    `
      select id
      from app.events
      order by
        case
          when status in ('published', 'locked') then 0
          when status = 'draft' then 1
          when status = 'finished' then 2
          else 3
        end asc,
        coalesce(starts_at, lock_at, published_at, created_at) desc
      limit 1
    `,
  );

  return result.rows[0]?.id ?? null;
}

async function resolveEventFighterIntakeScope(
  options?: AdminDatabaseLoadOptions,
): Promise<EventFighterIntakeScope> {
  const limitToCurrentEvent = options?.limitEventFighterIntakesToCurrentEvent === true;

  if (!limitToCurrentEvent) {
    return {
      limitToCurrentEvent: false,
      currentEventId: null,
    };
  }

  return {
    limitToCurrentEvent: true,
    currentEventId: await resolveCurrentOperationalEventId(),
  };
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function humanizeToken(value: string | null | undefined) {
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

function formatText(value: string | null | undefined) {
  return normalizeText(value) ?? "—";
}

function parseCount(value: number | string | null | undefined) {
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

function formatNumber(value: number | string | null | undefined) {
  return numberFormatter.format(parseCount(value));
}

function toDate(value: DateValue) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDateTime(value: DateValue) {
  const date = toDate(value);

  return date ? dateTimeFormatter.format(date) : "—";
}

function formatClipboardScalar(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/[\t\r\n]+/g, " ")
    .trim();
}

function escapeCsvCell(value: string) {
  if (!/[",\n]/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function buildDelimitedClipboardLine<Row>(
  row: Row,
  columns: ClipboardColumn<Row>[],
  delimiter: string,
) {
  return columns
    .map((column) => formatClipboardScalar(column.pick(row)))
    .join(delimiter);
}

function buildCsvClipboard<Row>(row: Row, columns: ClipboardColumn<Row>[]) {
  const header = columns.map((column) => column.key).join(",");
  const values = columns
    .map((column) => escapeCsvCell(formatClipboardScalar(column.pick(row))))
    .join(",");

  return `${header}\n${values}`;
}

function buildEventFighterIntakeCopyExports(
  row: EventFighterIntakeClipboardRow,
): AdminDatabaseRecordCopyExport[] {
  return [
    {
      id: "google-sheets-finance-row",
      label: "Copiar linha para planilha",
      description:
        "Linha em TSV, na ordem do export financeiro. Cole no Google Sheets a partir da primeira coluna.",
      content: buildDelimitedClipboardLine(
        row,
        EVENT_FIGHTER_FINANCE_CLIPBOARD_COLUMNS,
        "\t",
      ),
    },
    {
      id: "google-sheets-narratives-row",
      label: "Copiar narrativas",
      description:
        "Somente as 6 colunas de narrativas. Ideal para colar nas colunas que ficaram vazias.",
      content: buildDelimitedClipboardLine(
        row,
        EVENT_FIGHTER_NARRATIVES_CLIPBOARD_COLUMNS,
        "\t",
      ),
    },
    {
      id: "google-sheets-finance-csv",
      label: "Copiar CSV completo",
      description:
        "CSV com cabeçalho e linha do intake financeiro, útil para conferência ou import manual.",
      content: buildCsvClipboard(row, EVENT_FIGHTER_FINANCE_CLIPBOARD_COLUMNS),
    },
  ];
}

function formatStatus(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "—";
  }

  return statusLabels[normalized] ?? humanizeToken(normalized);
}

function formatSource(value: string | null | undefined) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "—";
  }

  return (
    sourceLabels[normalized.replace(/-/g, "_")] ?? humanizeToken(normalized)
  );
}

function formatWeightClass(value: string | null | undefined) {
  return humanizeToken(value);
}

function formatScore(value: number | string | null | undefined) {
  return `${formatNumber(value)} pts`;
}

function formatPhotoCount(value: number | string | null | undefined) {
  const count = parseCount(value);

  return `${numberFormatter.format(count)} ${count === 1 ? "foto" : "fotos"}`;
}

function buildLocation(
  city: string | null | undefined,
  stateCode: string | null | undefined,
) {
  const normalizedCity = normalizeText(city);
  const normalizedStateCode = normalizeText(stateCode);

  if (normalizedCity && normalizedStateCode) {
    return `${normalizedCity}, ${normalizedStateCode}`;
  }

  return normalizedCity ?? normalizedStateCode ?? "—";
}

function formatBoolean(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value ? "Sim" : "Não";
}

function formatAccountLabel(
  displayName: string | null | undefined,
  email: string | null | undefined,
) {
  const parts = [normalizeText(displayName), normalizeText(email)].filter(Boolean);

  return parts.length ? parts.join(" / ") : "—";
}

function createSection(
  title: string,
  fields: AdminDatabaseRecordField[],
): AdminDatabaseRecordSection {
  return {
    title,
    fields,
  };
}

export function isAdminDatabaseTableId(
  value: string,
): value is AdminDatabaseTableId {
  return value in adminDatabaseTables;
}

export function getAdminDatabaseTableMeta(value: string) {
  return isAdminDatabaseTableId(value) ? adminDatabaseTables[value] : null;
}

function createRow(
  id: string,
  cells: Record<string, string>,
): AdminDatabaseRow {
  return {
    id,
    cells,
  };
}

async function loadTableSummary(text: string, values?: readonly unknown[]) {
  const result = await queryDatabase<TableSummaryRow>(text, values);
  const row = result.rows[0];

  return {
    totalRows: parseCount(row?.totalRows),
    lastActivityAt: row?.lastActivityAt
      ? formatDateTime(row.lastActivityAt)
      : null,
  };
}

async function loadStatusCounts(text: string, values?: readonly unknown[]) {
  const result = await queryDatabase<StatusBreakdownRow>(text, values);

  return result.rows.map((row) => ({
    label: formatStatus(row.status),
    value: parseCount(row.total),
  }));
}

async function withTableFallback(
  config: TableFallbackConfig,
  load: () => Promise<AdminDatabaseTablePreview>,
) {
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
      errorMessage:
        error instanceof Error
          ? error.message
          : "Não foi possível ler esta tabela no ambiente atual.",
    };
  }
}
async function loadContactMessagesTable() {
  const config: TableFallbackConfig = {
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
      { key: "status", label: "Status" },
    ],
  };

  return withTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadTableSummary(
        `
          select
            count(*)::int as "totalRows",
            max(updated_at) as "lastActivityAt"
          from app.contact_messages
        `,
      ),
      loadStatusCounts(
        `
          select
            status,
            count(*)::int as total
          from app.contact_messages
          group by status
          order by count(*) desc, status asc
        `,
      ),
      queryDatabase<ContactMessagePreviewRow>(
        `
          select
            id,
            created_at as "createdAt",
            full_name as "fullName",
            email,
            subject,
            status
          from app.contact_messages
          order by created_at desc
          limit ${TABLE_PREVIEW_LIMIT}
        `,
      ),
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        createRow(row.id, {
          createdAt: formatDateTime(row.createdAt),
          fullName: formatText(row.fullName),
          email: formatText(row.email),
          subject: formatText(row.subject),
          status: formatStatus(row.status),
        }),
      ),
    };
  });
}

async function loadNewsletterSubscriptionsTable() {
  const config: TableFallbackConfig = {
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
      { key: "status", label: "Status" },
    ],
  };

  return withTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadTableSummary(
        `
          select
            count(*)::int as "totalRows",
            max(updated_at) as "lastActivityAt"
          from app.newsletter_subscriptions
        `,
      ),
      loadStatusCounts(
        `
          select
            status,
            count(*)::int as total
          from app.newsletter_subscriptions
          group by status
          order by count(*) desc, status asc
        `,
      ),
      queryDatabase<NewsletterPreviewRow>(
        `
          select
            id,
            subscribed_at as "subscribedAt",
            email,
            metadata ->> 'fullName' as "fullName",
            source,
            status
          from app.newsletter_subscriptions
          order by subscribed_at desc
          limit ${TABLE_PREVIEW_LIMIT}
        `,
      ),
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        createRow(row.id, {
          subscribedAt: formatDateTime(row.subscribedAt),
          email: formatText(row.email),
          fullName: formatText(row.fullName),
          source: formatSource(row.source),
          status: formatStatus(row.status),
        }),
      ),
    };
  });
}

async function loadPartnerInquiriesTable() {
  const config: TableFallbackConfig = {
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
      { key: "status", label: "Status" },
    ],
  };

  return withTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadTableSummary(
        `
          select
            count(*)::int as "totalRows",
            max(updated_at) as "lastActivityAt"
          from app.partner_inquiries
        `,
      ),
      loadStatusCounts(
        `
          select
            status,
            count(*)::int as total
          from app.partner_inquiries
          group by status
          order by count(*) desc, status asc
        `,
      ),
      queryDatabase<PartnerInquiryPreviewRow>(
        `
          select
            id,
            created_at as "createdAt",
            company_name as "companyName",
            full_name as "fullName",
            email,
            status
          from app.partner_inquiries
          order by created_at desc
          limit ${TABLE_PREVIEW_LIMIT}
        `,
      ),
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        createRow(row.id, {
          createdAt: formatDateTime(row.createdAt),
          companyName: formatText(row.companyName),
          fullName: formatText(row.fullName),
          email: formatText(row.email),
          status: formatStatus(row.status),
        }),
      ),
    };
  });
}

async function loadFighterApplicationsTable() {
  const config: TableFallbackConfig = {
    id: "fighter-applications",
    label: "Cadastro de Lutadores",
    tableName: "app.fighter_applications",
    description:
      "Aplicações enviadas por atletas interessados em participar do projeto.",
    previewLabel: "Últimos cadastros",
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "fighter", label: "Lutador" },
      { key: "weightClass", label: "Categoria" },
      { key: "location", label: "Cidade" },
      { key: "athleteWhatsapp", label: "WhatsApp" },
      { key: "status", label: "Status" },
    ],
  };

  return withTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadTableSummary(
        `
          select
            count(*)::int as "totalRows",
            max(updated_at) as "lastActivityAt"
          from app.fighter_applications
        `,
      ),
      loadStatusCounts(
        `
          select
            status,
            count(*)::int as total
          from app.fighter_applications
          group by status
          order by count(*) desc, status asc
        `,
      ),
      queryDatabase<FighterApplicationPreviewRow>(
        `
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
          limit ${TABLE_PREVIEW_LIMIT}
        `,
      ),
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        createRow(row.id, {
          createdAt: formatDateTime(row.createdAt),
          fighter:
            [normalizeText(row.fullName), normalizeText(row.nickname)]
              .filter(Boolean)
              .join(" / ") || "—",
          weightClass: formatWeightClass(row.weightClass),
          location: buildLocation(row.city, row.stateCode),
          athleteWhatsapp: formatText(row.athleteWhatsapp),
          status: formatStatus(row.status),
        }),
      ),
    };
  });
}

async function loadEventFighterIntakesTable(intakeScope: EventFighterIntakeScope) {
  const config: TableFallbackConfig = {
    id: "event-fighter-intakes",
    label: "Intake de Evento",
    tableName: "app.event_fighter_intakes",
    description:
      "Fichas operacionais enviadas pelos lutadores para cada edição.",
    previewLabel: "Últimos intakes",
    columns: [
      { key: "submittedAt", label: "Enviado em" },
      { key: "fighter", label: "Atleta" },
      { key: "email", label: "Email" },
      { key: "phoneWhatsapp", label: "WhatsApp" },
      { key: "photoCount", label: "Fotos" },
      { key: "intakeStatus", label: "Status" },
    ],
  };

  if (intakeScope.limitToCurrentEvent && !intakeScope.currentEventId) {
    return {
      ...config,
      rows: [],
      statusCounts: [],
      totalRows: 0,
      lastActivityAt: null,
    };
  }

  const eventScopeValues = intakeScope.currentEventId
    ? [intakeScope.currentEventId]
    : undefined;
  const eventScopeJoin = intakeScope.currentEventId
    ? `
          left join app.event_fighters event_fighter
            on event_fighter.id = intake.event_fighter_id
          left join app.events event
            on event.id = event_fighter.event_id
        `
    : "";
  const eventScopeWhere = intakeScope.currentEventId
    ? `
          where (
            event.id = $1::uuid
            or (
              intake.event_fighter_id is null
              and intake.source = '${EVENT_FIGHTER_INTAKE_SOURCE}'
            )
          )
        `
    : "";

  return withTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadTableSummary(
        `
          select
            count(*)::int as "totalRows",
            max(intake.updated_at) as "lastActivityAt"
          from app.event_fighter_intakes intake
          ${eventScopeJoin}
          ${eventScopeWhere}
        `,
        eventScopeValues,
      ),
      loadStatusCounts(
        `
          select
            intake_status as status,
            count(*)::int as total
          from app.event_fighter_intakes intake
          ${eventScopeJoin}
          ${eventScopeWhere}
          group by intake_status
          order by count(*) desc, intake_status asc
        `,
        eventScopeValues,
      ),
      queryDatabase<EventFighterIntakePreviewRow>(
        `
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
          ${eventScopeJoin}
          left join lateral (
            select count(*)::int as total
            from app.event_fighter_intake_photos photo
            where photo.intake_id = intake.id
          ) photo_counts on true
          ${eventScopeWhere}
          order by intake.submitted_at desc
          limit ${TABLE_PREVIEW_LIMIT}
        `,
        eventScopeValues,
      ),
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        createRow(row.id, {
          submittedAt: formatDateTime(row.submittedAt),
          fighter:
            [normalizeText(row.fullName), normalizeText(row.nickname)]
              .filter(Boolean)
              .join(" / ") || "—",
          email: formatText(row.email),
          phoneWhatsapp: formatText(row.phoneWhatsapp),
          photoCount: formatPhotoCount(row.photoCount),
          intakeStatus: formatStatus(row.intakeStatus),
        }),
      ),
    };
  });
}

async function loadFantasyEntriesTable() {
  const config: TableFallbackConfig = {
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
      { key: "entryStatus", label: "Status" },
    ],
  };

  return withTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadTableSummary(
        `
          select
            count(*)::int as "totalRows",
            max(updated_at) as "lastActivityAt"
          from app.fantasy_entries
        `,
      ),
      loadStatusCounts(
        `
          select
            entry_status as status,
            count(*)::int as total
          from app.fantasy_entries
          group by entry_status
          order by count(*) desc, entry_status asc
        `,
      ),
      queryDatabase<FantasyEntryPreviewRow>(
        `
          select
            entry.id,
            entry.submitted_at as "submittedAt",
            event.name as "eventName",
            entry.display_name as "displayName",
            entry.email,
            entry.city,
            entry.state_code as "stateCode",
            entry.score_cached as "scoreCached",
            entry.entry_status as "entryStatus"
          from app.fantasy_entries entry
          join app.events event
            on event.id = entry.event_id
          order by entry.submitted_at desc
          limit ${TABLE_PREVIEW_LIMIT}
        `,
      ),
    ]);

    return {
      ...config,
      ...summary,
      statusCounts,
      rows: result.rows.map((row) =>
        createRow(row.id, {
          submittedAt: formatDateTime(row.submittedAt),
          eventName: formatText(row.eventName),
          displayName: formatText(row.displayName),
          location: buildLocation(row.city, row.stateCode),
          scoreCached: formatScore(row.scoreCached),
          entryStatus: formatStatus(row.entryStatus),
        }),
      ),
    };
  });
}

export async function loadAdminDatabaseOverview(
  options: AdminDatabaseLoadOptions = {},
  env: ServerEnv = getServerEnv(),
): Promise<AdminDatabaseOverview> {
  const normalizedOptions: AdminDatabaseLoadOptions = {
    ...options,
    visibleTableIds: getNormalizedVisibleTableIds(options),
  };

  if (!isDatabaseConfigured(env) && isAdminReadUpstreamConfigured(env)) {
    try {
      const overviewSearchParams = new URLSearchParams();

      if (normalizedOptions.limitEventFighterIntakesToCurrentEvent) {
        overviewSearchParams.set("event_scope", "current");
      }

      const overviewUrl = `${env.upstreamApiBaseUrl}${env.adminDatabaseOverviewPath}${overviewSearchParams.size ? `?${overviewSearchParams.toString()}` : ""}`;
      const overview = await getJsonFromUpstream<AdminDatabaseOverview>(
        overviewUrl,
        {
          bearerToken: getAdminReadUpstreamBearerToken(env)!,
          timeoutMs: env.upstreamRequestTimeoutMs,
        },
      );

      return applyOverviewLoadOptions(overview, normalizedOptions);
    } catch (error) {
      console.error(
        "[admin/database] failed to load overview from upstream",
        error,
      );
    }
  }

  if (!isDatabaseConfigured(env)) {
    return {
      databaseConfigured: false,
      totalRows: 0,
      tables: normalizedOptions.visibleTableIds!.map((tableId) => ({
        ...adminDatabaseTables[tableId],
        columns: [],
        rows: [],
        statusCounts: [],
        totalRows: null,
        lastActivityAt: null,
      })),
      availableTables: 0,
      unavailableTables: normalizedOptions.visibleTableIds!.length,
    };
  }

  const intakeScope = await resolveEventFighterIntakeScope(normalizedOptions);
  const tables = await Promise.all(
    normalizedOptions.visibleTableIds!.map((tableId) => {
      switch (tableId) {
        case "contact-messages":
          return loadContactMessagesTable();
        case "newsletter-subscriptions":
          return loadNewsletterSubscriptionsTable();
        case "partner-inquiries":
          return loadPartnerInquiriesTable();
        case "fighter-applications":
          return loadFighterApplicationsTable();
        case "event-fighter-intakes":
          return loadEventFighterIntakesTable(intakeScope);
        case "fantasy-entries":
          return loadFantasyEntriesTable();
        default: {
          const unexpectedTableId: never = tableId;
          throw new Error(`Unexpected admin database table id: ${unexpectedTableId}`);
        }
      }
    }),
  );

  const availableTables = tables.filter((table) => !table.errorMessage).length;
  const unavailableTables = tables.length - availableTables;
  const totalRows = tables.reduce(
    (sum, table) => sum + (table.totalRows ?? 0),
    0,
  );

  return {
    databaseConfigured: true,
    totalRows,
    tables,
    availableTables,
    unavailableTables,
  };
}

function buildAdminDatabaseTableUnavailable(
  table: AdminDatabaseTableMeta,
): AdminDatabaseTableData {
  return {
    databaseConfigured: false,
    table,
    columns: [],
    rows: [],
    statusCounts: [],
    totalRows: 0,
    lastActivityAt: null,
    errorMessage:
      "Nem o banco local nem o upstream administrativo estão disponíveis neste ambiente.",
  };
}

function buildAdminDatabaseTableForbidden(
  table: AdminDatabaseTableMeta,
): AdminDatabaseTableData {
  return {
    databaseConfigured: true,
    table,
    columns: [],
    rows: [],
    statusCounts: [],
    totalRows: 0,
    lastActivityAt: null,
    errorMessage: "Seu perfil não tem acesso a esta tabela.",
  };
}

function buildAdminDatabaseRecordUnavailable(
  table: AdminDatabaseTableMeta,
  rowId: string,
): AdminDatabaseRecordData {
  return {
    databaseConfigured: false,
    table,
    rowId,
    title: "Registro indisponível",
    subtitle: null,
    sections: [],
    errorMessage:
      "Nem o banco local nem o upstream administrativo estão disponíveis neste ambiente.",
  };
}

async function loadAdminDatabaseTableFromUpstream(
  tableId: AdminDatabaseTableId,
  options: AdminDatabaseLoadOptions,
  env: ServerEnv,
) {
  if (!isAdminReadUpstreamConfigured(env)) {
    return null;
  }

  const searchParams = new URLSearchParams();

  if (
    options.limitEventFighterIntakesToCurrentEvent &&
    tableId === "event-fighter-intakes"
  ) {
    searchParams.set("event_scope", "current");
  }

  const requestPath = `${ADMIN_DATABASE_ROUTE_BASE}/${tableId}`;
  const requestUrl = `${env.upstreamApiBaseUrl}${requestPath}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  try {
    return await getJsonFromUpstream<AdminDatabaseTableData>(
      requestUrl,
      {
        bearerToken: getAdminReadUpstreamBearerToken(env)!,
        timeoutMs: env.upstreamRequestTimeoutMs,
      },
    );
  } catch (error) {
    if (error instanceof UpstreamApiError && error.status === 404) {
      return null;
    }

    console.error("[admin/database] failed to load table from upstream", {
      error,
      tableId,
    });

    return null;
  }
}

async function loadAdminDatabaseRecordFromUpstream(
  tableId: AdminDatabaseTableId,
  rowId: string,
  options: AdminDatabaseLoadOptions,
  env: ServerEnv,
) {
  if (!isAdminReadUpstreamConfigured(env)) {
    return null;
  }

  const searchParams = new URLSearchParams();

  if (
    options.limitEventFighterIntakesToCurrentEvent &&
    tableId === "event-fighter-intakes"
  ) {
    searchParams.set("event_scope", "current");
  }

  const requestPath = `${ADMIN_DATABASE_ROUTE_BASE}/${tableId}/${encodeURIComponent(rowId)}`;
  const requestUrl = `${env.upstreamApiBaseUrl}${requestPath}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  try {
    return await getJsonFromUpstream<AdminDatabaseRecordData>(
      requestUrl,
      {
        bearerToken: getAdminReadUpstreamBearerToken(env)!,
        timeoutMs: env.upstreamRequestTimeoutMs,
      },
    );
  } catch (error) {
    if (error instanceof UpstreamApiError && error.status === 404) {
      return null;
    }

    console.error("[admin/database] failed to load record from upstream", {
      error,
      tableId,
      rowId,
    });

    return null;
  }
}

async function loadContactMessagesTableDataDirect(): Promise<AdminDatabaseTableData> {
  const table = adminDatabaseTables["contact-messages"];
  const [summary, statusCounts, result] = await Promise.all([
    loadTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.contact_messages
    `),
    loadStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.contact_messages
      group by status
      order by count(*) desc, status asc
    `),
    queryDatabase<ContactMessagePreviewRow>(`
      select
        id,
        created_at as "createdAt",
        full_name as "fullName",
        email,
        subject,
        status
      from app.contact_messages
      order by created_at desc
    `),
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "fullName", label: "Nome" },
      { key: "email", label: "Email" },
      { key: "subject", label: "Assunto" },
      { key: "status", label: "Status" },
    ],
    rows: result.rows.map((row) =>
      createRow(row.id, {
        createdAt: formatDateTime(row.createdAt),
        fullName: formatText(row.fullName),
        email: formatText(row.email),
        subject: formatText(row.subject),
        status: formatStatus(row.status),
      }),
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt,
  };
}

async function loadNewsletterSubscriptionsTableDataDirect(): Promise<AdminDatabaseTableData> {
  const table = adminDatabaseTables["newsletter-subscriptions"];
  const [summary, statusCounts, result] = await Promise.all([
    loadTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.newsletter_subscriptions
    `),
    loadStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.newsletter_subscriptions
      group by status
      order by count(*) desc, status asc
    `),
    queryDatabase<NewsletterPreviewRow>(`
      select
        id,
        subscribed_at as "subscribedAt",
        email,
        metadata ->> 'fullName' as "fullName",
        source,
        status
      from app.newsletter_subscriptions
      order by subscribed_at desc
    `),
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "subscribedAt", label: "Data" },
      { key: "email", label: "Email" },
      { key: "fullName", label: "Nome" },
      { key: "source", label: "Origem" },
      { key: "status", label: "Status" },
    ],
    rows: result.rows.map((row) =>
      createRow(row.id, {
        subscribedAt: formatDateTime(row.subscribedAt),
        email: formatText(row.email),
        fullName: formatText(row.fullName),
        source: formatSource(row.source),
        status: formatStatus(row.status),
      }),
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt,
  };
}

async function loadPartnerInquiriesTableDataDirect(): Promise<AdminDatabaseTableData> {
  const table = adminDatabaseTables["partner-inquiries"];
  const [summary, statusCounts, result] = await Promise.all([
    loadTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.partner_inquiries
    `),
    loadStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.partner_inquiries
      group by status
      order by count(*) desc, status asc
    `),
    queryDatabase<PartnerInquiryPreviewRow>(`
      select
        id,
        created_at as "createdAt",
        company_name as "companyName",
        full_name as "fullName",
        email,
        status
      from app.partner_inquiries
      order by created_at desc
    `),
  ]);

  return {
    databaseConfigured: true,
    table,
    columns: [
      { key: "createdAt", label: "Data" },
      { key: "companyName", label: "Empresa" },
      { key: "fullName", label: "Contato" },
      { key: "email", label: "Email" },
      { key: "status", label: "Status" },
    ],
    rows: result.rows.map((row) =>
      createRow(row.id, {
        createdAt: formatDateTime(row.createdAt),
        companyName: formatText(row.companyName),
        fullName: formatText(row.fullName),
        email: formatText(row.email),
        status: formatStatus(row.status),
      }),
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt,
  };
}

async function loadFighterApplicationsTableDataDirect(): Promise<AdminDatabaseTableData> {
  const table = adminDatabaseTables["fighter-applications"];
  const [summary, statusCounts, result] = await Promise.all([
    loadTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.fighter_applications
    `),
    loadStatusCounts(`
      select
        status,
        count(*)::int as total
      from app.fighter_applications
      group by status
      order by count(*) desc, status asc
    `),
    queryDatabase<FighterApplicationPreviewRow>(`
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
    `),
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
      { key: "status", label: "Status" },
    ],
    rows: result.rows.map((row) =>
      createRow(row.id, {
        createdAt: formatDateTime(row.createdAt),
        fighter:
          [normalizeText(row.fullName), normalizeText(row.nickname)]
            .filter(Boolean)
            .join(" / ") || "—",
        weightClass: formatWeightClass(row.weightClass),
        location: buildLocation(row.city, row.stateCode),
        athleteWhatsapp: formatText(row.athleteWhatsapp),
        status: formatStatus(row.status),
      }),
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt,
  };
}

async function loadEventFighterIntakesTableDataDirect(
  intakeScope: EventFighterIntakeScope,
): Promise<AdminDatabaseTableData> {
  const table = adminDatabaseTables["event-fighter-intakes"];

  if (intakeScope.limitToCurrentEvent && !intakeScope.currentEventId) {
    return {
      databaseConfigured: true,
      table,
      columns: [
        { key: "submittedAt", label: "Enviado em" },
        { key: "fighter", label: "Atleta" },
        { key: "email", label: "Email" },
        { key: "phoneWhatsapp", label: "WhatsApp" },
        { key: "photoCount", label: "Fotos" },
        { key: "intakeStatus", label: "Status" },
      ],
      rows: [],
      statusCounts: [],
      totalRows: 0,
      lastActivityAt: null,
    };
  }

  const eventScopeValues = intakeScope.currentEventId
    ? [intakeScope.currentEventId]
    : undefined;
  const eventScopeJoin = intakeScope.currentEventId
    ? `
      left join app.event_fighters event_fighter
        on event_fighter.id = intake.event_fighter_id
      left join app.events event
        on event.id = event_fighter.event_id
    `
    : "";
  const eventScopeWhere = intakeScope.currentEventId
    ? `
      where (
        event.id = $1::uuid
        or (
          intake.event_fighter_id is null
          and intake.source = '${EVENT_FIGHTER_INTAKE_SOURCE}'
        )
      )
    `
    : "";

  const [summary, statusCounts, result] = await Promise.all([
    loadTableSummary(
      `
      select
        count(*)::int as "totalRows",
        max(intake.updated_at) as "lastActivityAt"
      from app.event_fighter_intakes intake
      ${eventScopeJoin}
      ${eventScopeWhere}
    `,
      eventScopeValues,
    ),
    loadStatusCounts(
      `
      select
        intake_status as status,
        count(*)::int as total
      from app.event_fighter_intakes intake
      ${eventScopeJoin}
      ${eventScopeWhere}
      group by intake_status
      order by count(*) desc, intake_status asc
    `,
      eventScopeValues,
    ),
    queryDatabase<EventFighterIntakePreviewRow>(
      `
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
      ${eventScopeJoin}
      left join lateral (
        select count(*)::int as total
        from app.event_fighter_intake_photos photo
        where photo.intake_id = intake.id
      ) photo_counts on true
      ${eventScopeWhere}
      order by intake.submitted_at desc
    `,
      eventScopeValues,
    ),
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
      { key: "intakeStatus", label: "Status" },
    ],
    rows: result.rows.map((row) =>
      createRow(row.id, {
        submittedAt: formatDateTime(row.submittedAt),
        fighter:
          [normalizeText(row.fullName), normalizeText(row.nickname)]
            .filter(Boolean)
            .join(" / ") || "—",
        email: formatText(row.email),
        phoneWhatsapp: formatText(row.phoneWhatsapp),
        photoCount: formatPhotoCount(row.photoCount),
        intakeStatus: formatStatus(row.intakeStatus),
      }),
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt,
  };
}

async function loadFantasyEntriesTableDataDirect(): Promise<AdminDatabaseTableData> {
  const table = adminDatabaseTables["fantasy-entries"];
  const [summary, statusCounts, result] = await Promise.all([
    loadTableSummary(`
      select
        count(*)::int as "totalRows",
        max(updated_at) as "lastActivityAt"
      from app.fantasy_entries
    `),
    loadStatusCounts(`
      select
        entry_status as status,
        count(*)::int as total
      from app.fantasy_entries
      group by entry_status
      order by count(*) desc, entry_status asc
    `),
    queryDatabase<FantasyEntryPreviewRow>(`
      select
        entry.id,
        entry.submitted_at as "submittedAt",
        event.name as "eventName",
        entry.display_name as "displayName",
        entry.email,
        entry.city,
        entry.state_code as "stateCode",
        entry.score_cached as "scoreCached",
        entry.entry_status as "entryStatus"
      from app.fantasy_entries entry
      join app.events event
        on event.id = entry.event_id
      order by entry.submitted_at desc
    `),
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
      { key: "entryStatus", label: "Status" },
    ],
    rows: result.rows.map((row) =>
      createRow(row.id, {
        submittedAt: formatDateTime(row.submittedAt),
        eventName: formatText(row.eventName),
        displayName: formatText(row.displayName),
        location: buildLocation(row.city, row.stateCode),
        scoreCached: formatScore(row.scoreCached),
        entryStatus: formatStatus(row.entryStatus),
      }),
    ),
    statusCounts,
    totalRows: summary.totalRows,
    lastActivityAt: summary.lastActivityAt,
  };
}

async function loadContactMessageRecordDirect(
  rowId: string,
): Promise<AdminDatabaseRecordData | null> {
  const table = adminDatabaseTables["contact-messages"];
  const result = await queryDatabase<{
    id: string;
    fullName: string;
    email: string;
    recipientEmail: string;
    subject: string;
    message: string;
    source: string;
    status: string;
    respondedAt: DateValue;
    reviewerNotes: string | null;
    requestId: string | null;
    requestOrigin: string | null;
    requestIpHash: string | null;
    userAgent: string | null;
    metadata: unknown;
    createdAt: DateValue;
    updatedAt: DateValue;
    assignedDisplayName: string | null;
    assignedEmail: string | null;
  }>(
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
    [rowId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: formatText(row.fullName),
    subtitle: formatText(row.email),
    sections: [
      createSection("Emitente", [
        { label: "Nome", value: formatText(row.fullName) },
        { label: "Email", value: formatText(row.email) },
        { label: "Email destinatário", value: formatText(row.recipientEmail) },
      ]),
      createSection("Mensagem", [
        { label: "Assunto", value: formatText(row.subject) },
        { label: "Mensagem", value: formatText(row.message) },
        { label: "Origem", value: formatSource(row.source) },
        { label: "Status", value: formatStatus(row.status) },
      ]),
      createSection("Operação", [
        {
          label: "Responsável",
          value: formatAccountLabel(row.assignedDisplayName, row.assignedEmail),
        },
        { label: "Respondido em", value: formatDateTime(row.respondedAt) },
        { label: "Notas internas", value: formatText(row.reviewerNotes) },
      ]),
      createSection("Rastreamento", [
        { label: "Criado em", value: formatDateTime(row.createdAt) },
        { label: "Atualizado em", value: formatDateTime(row.updatedAt) },
        { label: "Request ID", value: formatText(row.requestId) },
        { label: "Origem da request", value: formatText(row.requestOrigin) },
        { label: "Hash do IP", value: formatText(row.requestIpHash) },
        { label: "User agent", value: formatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} },
      ]),
    ],
  };
}

async function loadNewsletterRecordDirect(
  rowId: string,
): Promise<AdminDatabaseRecordData | null> {
  const table = adminDatabaseTables["newsletter-subscriptions"];
  const result = await queryDatabase<{
    id: string;
    email: string;
    source: string;
    status: string;
    requestId: string | null;
    requestOrigin: string | null;
    requestIpHash: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown> | null;
    subscribedAt: DateValue;
    updatedAt: DateValue;
    unsubscribedAt: DateValue;
  }>(
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
    [rowId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: formatText(row.email),
    subtitle: formatStatus(row.status),
    sections: [
      createSection("Emitente", [
        { label: "Email", value: formatText(row.email) },
        {
          label: "Nome informado",
          value: formatText(
            typeof row.metadata?.fullName === "string" ? row.metadata.fullName : null,
          ),
        },
        { label: "Origem", value: formatSource(row.source) },
        { label: "Status", value: formatStatus(row.status) },
      ]),
      createSection("Atividade", [
        { label: "Inscrito em", value: formatDateTime(row.subscribedAt) },
        { label: "Atualizado em", value: formatDateTime(row.updatedAt) },
        { label: "Descadastrado em", value: formatDateTime(row.unsubscribedAt) },
      ]),
      createSection("Rastreamento", [
        { label: "Request ID", value: formatText(row.requestId) },
        { label: "Origem da request", value: formatText(row.requestOrigin) },
        { label: "Hash do IP", value: formatText(row.requestIpHash) },
        { label: "User agent", value: formatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} },
      ]),
    ],
  };
}

async function loadPartnerInquiryRecordDirect(
  rowId: string,
): Promise<AdminDatabaseRecordData | null> {
  const table = adminDatabaseTables["partner-inquiries"];
  const result = await queryDatabase<{
    id: string;
    fullName: string;
    companyName: string;
    roleTitle: string;
    email: string;
    phone: string;
    companyProfile: string | null;
    partnershipIntent: string;
    source: string;
    status: string;
    lastContactedAt: DateValue;
    reviewerNotes: string | null;
    requestId: string | null;
    requestOrigin: string | null;
    requestIpHash: string | null;
    userAgent: string | null;
    metadata: unknown;
    createdAt: DateValue;
    updatedAt: DateValue;
    assignedDisplayName: string | null;
    assignedEmail: string | null;
  }>(
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
    [rowId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: formatText(row.companyName),
    subtitle: formatText(row.fullName),
    sections: [
      createSection("Emitente", [
        { label: "Contato", value: formatText(row.fullName) },
        { label: "Empresa", value: formatText(row.companyName) },
        { label: "Cargo", value: formatText(row.roleTitle) },
        { label: "Email", value: formatText(row.email) },
        { label: "Telefone", value: formatText(row.phone) },
        { label: "Perfil da empresa", value: formatText(row.companyProfile) },
      ]),
      createSection("Oportunidade", [
        { label: "Interesse", value: formatText(row.partnershipIntent) },
        { label: "Origem", value: formatSource(row.source) },
        { label: "Status", value: formatStatus(row.status) },
        {
          label: "Responsável",
          value: formatAccountLabel(row.assignedDisplayName, row.assignedEmail),
        },
        { label: "Último contato", value: formatDateTime(row.lastContactedAt) },
        { label: "Notas internas", value: formatText(row.reviewerNotes) },
      ]),
      createSection("Rastreamento", [
        { label: "Criado em", value: formatDateTime(row.createdAt) },
        { label: "Atualizado em", value: formatDateTime(row.updatedAt) },
        { label: "Request ID", value: formatText(row.requestId) },
        { label: "Origem da request", value: formatText(row.requestOrigin) },
        { label: "Hash do IP", value: formatText(row.requestIpHash) },
        { label: "User agent", value: formatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} },
      ]),
    ],
  };
}

async function loadFighterApplicationRecordDirect(
  rowId: string,
): Promise<AdminDatabaseRecordData | null> {
  const table = adminDatabaseTables["fighter-applications"];
  const result = await queryDatabase<{
    id: string;
    fullName: string | null;
    nickname: string | null;
    birthDate: string | null;
    city: string | null;
    stateCode: string | null;
    team: string | null;
    weightClass: string | null;
    tapologyProfile: string | null;
    instagramProfile: string | null;
    specialty: string | null;
    specialtyOther: string | null;
    competitionHistory: string | null;
    martialArtsTitles: string | null;
    curiosities: string | null;
    roastConsent: boolean;
    source: string;
    status: string;
    reviewerNotes: string | null;
    requestId: string | null;
    requestOrigin: string | null;
    requestIpHash: string | null;
    userAgent: string | null;
    metadata: unknown;
    createdAt: DateValue;
    updatedAt: DateValue;
    assignedDisplayName: string | null;
    assignedEmail: string | null;
    contacts: Array<Record<string, unknown>> | null;
  }>(
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
    [rowId],
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
      [formatText(row.fullName), normalizeText(row.nickname)]
        .filter((value) => value !== "—")
        .join(" / ") || "Cadastro de lutador",
    subtitle: formatStatus(row.status),
    sections: [
      createSection("Emitente", [
        { label: "Nome", value: formatText(row.fullName) },
        { label: "Apelido", value: formatText(row.nickname) },
        { label: "Data de nascimento", value: formatText(row.birthDate) },
        { label: "Cidade", value: buildLocation(row.city, row.stateCode) },
        { label: "Equipe", value: formatText(row.team) },
        { label: "Categoria", value: formatWeightClass(row.weightClass) },
      ]),
      createSection("Perfis e especialidade", [
        { label: "Tapology", value: formatText(row.tapologyProfile) },
        { label: "Instagram", value: formatText(row.instagramProfile) },
        { label: "Especialidade", value: humanizeToken(row.specialty) },
        { label: "Especialidade livre", value: formatText(row.specialtyOther) },
      ]),
      createSection("Histórico", [
        { label: "Histórico competitivo", value: formatText(row.competitionHistory) },
        { label: "Títulos", value: formatText(row.martialArtsTitles) },
        { label: "Curiosidades", value: formatText(row.curiosities) },
        { label: "Autorizou roast", value: formatBoolean(row.roastConsent) },
        { label: "Contatos enviados", value: row.contacts ?? [] },
      ]),
      createSection("Operação", [
        { label: "Origem", value: formatSource(row.source) },
        { label: "Status", value: formatStatus(row.status) },
        {
          label: "Responsável",
          value: formatAccountLabel(row.assignedDisplayName, row.assignedEmail),
        },
        { label: "Notas internas", value: formatText(row.reviewerNotes) },
      ]),
      createSection("Rastreamento", [
        { label: "Criado em", value: formatDateTime(row.createdAt) },
        { label: "Atualizado em", value: formatDateTime(row.updatedAt) },
        { label: "Request ID", value: formatText(row.requestId) },
        { label: "Origem da request", value: formatText(row.requestOrigin) },
        { label: "Hash do IP", value: formatText(row.requestIpHash) },
        { label: "User agent", value: formatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} },
      ]),
    ],
  };
}

async function loadFantasyEntryRecordDirect(
  rowId: string,
): Promise<AdminDatabaseRecordData | null> {
  const table = adminDatabaseTables["fantasy-entries"];
  const result = await queryDatabase<{
    id: string;
    referenceCode: string;
    eventName: string;
    displayName: string;
    fullName: string;
    email: string;
    whatsapp: string;
    city: string;
    stateCode: string;
    marketingConsent: boolean;
    source: string;
    entryStatus: string;
    scoreCached: number;
    perfectPicksCached: number;
    requestId: string | null;
    requestOrigin: string | null;
    requestIpHash: string | null;
    userAgent: string | null;
    metadata: unknown;
    submittedAt: DateValue;
    createdAt: DateValue;
    updatedAt: DateValue;
    picks: Array<Record<string, unknown>> | null;
  }>(
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
    [rowId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    databaseConfigured: true,
    table,
    rowId,
    title: formatText(row.displayName),
    subtitle: formatText(row.eventName),
    sections: [
      createSection("Emitente", [
        { label: "Nome público", value: formatText(row.displayName) },
        { label: "Nome completo", value: formatText(row.fullName) },
        { label: "Email", value: formatText(row.email) },
        { label: "WhatsApp", value: formatText(row.whatsapp) },
        { label: "Cidade", value: buildLocation(row.city, row.stateCode) },
        { label: "Consentimento marketing", value: formatBoolean(row.marketingConsent) },
      ]),
      createSection("Fantasy", [
        { label: "Evento", value: formatText(row.eventName) },
        { label: "Código de referência", value: formatText(row.referenceCode) },
        { label: "Status", value: formatStatus(row.entryStatus) },
        { label: "Pontuação", value: formatScore(row.scoreCached) },
        {
          label: "Perfect picks",
          value: `${formatNumber(row.perfectPicksCached)} acertos perfeitos`,
        },
        { label: "Origem", value: formatSource(row.source) },
        { label: "Picks", value: row.picks ?? [] },
      ]),
      createSection("Rastreamento", [
        { label: "Enviado em", value: formatDateTime(row.submittedAt) },
        { label: "Criado em", value: formatDateTime(row.createdAt) },
        { label: "Atualizado em", value: formatDateTime(row.updatedAt) },
        { label: "Request ID", value: formatText(row.requestId) },
        { label: "Origem da request", value: formatText(row.requestOrigin) },
        { label: "Hash do IP", value: formatText(row.requestIpHash) },
        { label: "User agent", value: formatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} },
      ]),
    ],
  };
}

async function loadEventFighterIntakeRecordDirect(
  rowId: string,
  intakeScope: EventFighterIntakeScope,
): Promise<AdminDatabaseRecordData | null> {
  const table = adminDatabaseTables["event-fighter-intakes"];

  if (intakeScope.limitToCurrentEvent && !intakeScope.currentEventId) {
    return null;
  }

  const recordValues = intakeScope.currentEventId
    ? [rowId, intakeScope.currentEventId]
    : [rowId];
  const eventScopeClause = intakeScope.currentEventId
    ? `
          and (
            event.id = $2::uuid
            or (
              intake.event_fighter_id is null
              and intake.source = '${EVENT_FIGHTER_INTAKE_SOURCE}'
            )
          )
      `
    : "";

  const result = await withDatabaseTransaction(
    {
      actorRole: "service",
      requestId: `admin-database-record-${rowId}`,
    },
    async (transaction) =>
      transaction.query<
        EventFighterIntakeClipboardRow & {
          requestIpHash: string | null;
          submittedByDisplayName: string | null;
          submittedByEmail: string | null;
          reviewedByDisplayName: string | null;
          reviewedByEmail: string | null;
          photos: Array<Record<string, unknown>> | null;
        }
      >(
        `
          select
            intake.id,
            event.name as "eventName",
            fighter.display_name as "fighterName",
            intake.event_fighter_id as "eventFighterId",
            intake.submitted_by_account_id as "submittedByAccountId",
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
            intake.state_code as "stateCode",
            intake.education_level as "educationLevel",
            intake.team,
            intake.coach_name as "coachName",
            intake.fight_graduations as "fightGraduations",
            intake.tapology_profile as "tapologyProfile",
            intake.instagram_profile as "instagramProfile",
            intake.coach_contact as "coachContact",
            intake.manager_name as "managerName",
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
            intake.reviewed_by_account_id as "reviewedByAccountId",
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
          ${eventScopeClause}
          limit 1
        `,
        recordValues,
      ),
    {
      requiresEncryptionKey: true,
    },
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
      [formatText(row.fullName), normalizeText(row.nickname)]
        .filter((value) => value !== "—")
        .join(" / ") || "Intake de evento",
    subtitle: formatText(row.eventName ?? row.fighterName),
    copyExports: buildEventFighterIntakeCopyExports(row),
    sections: [
      createSection("Emitente", [
        { label: "Evento", value: formatText(row.eventName) },
        { label: "Lutador vinculado", value: formatText(row.fighterName) },
        { label: "Nome", value: formatText(row.fullName) },
        { label: "Apelido", value: formatText(row.nickname) },
        { label: "Email", value: formatText(row.email) },
        { label: "WhatsApp", value: formatText(row.phoneWhatsapp) },
        { label: "Nascimento", value: formatText(row.birthDate) },
        { label: "Cidade", value: formatText(row.city) },
      ]),
      createSection("Documento e pagamento", [
        { label: "CPF", value: formatText(row.cpf) },
        { label: "CPF final", value: formatText(row.cpfLast4) },
        { label: "Tipo de chave PIX", value: humanizeToken(row.pixKeyType) },
        { label: "Chave PIX", value: formatText(row.pixKey) },
        { label: "PIX final", value: formatText(row.pixKeyLast4) },
      ]),
      createSection("Perfil esportivo", [
        { label: "Cartel", value: formatText(row.recordSummary) },
        { label: "Categoria", value: formatText(row.category) },
        { label: "Altura", value: formatText(row.height) },
        { label: "Envergadura", value: formatText(row.reach) },
        { label: "Escolaridade", value: formatText(row.educationLevel) },
        { label: "Equipe", value: formatText(row.team) },
        { label: "Graduações", value: formatText(row.fightGraduations) },
        { label: "Tapology", value: formatText(row.tapologyProfile) },
        { label: "Instagram", value: formatText(row.instagramProfile) },
        { label: "Especialidade principal", value: formatText(row.primarySpecialty) },
        { label: "Especialidades adicionais", value: formatText(row.additionalSpecialties) },
      ]),
      createSection("Equipe e operação", [
        { label: "Contato do coach", value: formatText(row.coachContact) },
        { label: "Contato do manager", value: formatText(row.managerContact) },
        { label: "Corner 1", value: formatText(row.cornerOneName) },
        { label: "Corner 2", value: formatText(row.cornerTwoName) },
        { label: "Tem plano de saúde", value: formatBoolean(row.hasHealthInsurance) },
        {
          label: "Plano de saúde",
          value: formatText(row.healthInsuranceProvider),
        },
        { label: "Status", value: formatStatus(row.intakeStatus) },
        {
          label: "Enviado por",
          value: formatAccountLabel(row.submittedByDisplayName, row.submittedByEmail),
        },
        {
          label: "Revisado por",
          value: formatAccountLabel(row.reviewedByDisplayName, row.reviewedByEmail),
        },
        { label: "Revisado em", value: formatDateTime(row.reviewedAt) },
        { label: "Notas internas", value: formatText(row.staffNotes) },
      ]),
      createSection("Narrativas", [
        { label: "Histórico competitivo", value: formatText(row.competitionHistory) },
        { label: "Títulos", value: formatText(row.titlesWon) },
        { label: "História de vida", value: formatText(row.lifeStory) },
        { label: "História engraçada", value: formatText(row.funnyStory) },
        { label: "Curiosidades", value: formatText(row.curiosities) },
        { label: "Hobbies", value: formatText(row.hobbies) },
      ]),
      createSection("Assets", [
        {
          label: "Fotos enviadas",
          value: Array.isArray(row.photos)
            ? row.photos.map((photo) => {
                if (!photo || typeof photo !== "object" || Array.isArray(photo)) {
                  return photo;
                }

                const normalizedPhoto = photo as Record<string, unknown>;

                return {
                  ...normalizedPhoto,
                  campo: humanizeToken(
                    typeof normalizedPhoto.campo === "string" ? normalizedPhoto.campo : null,
                  ),
                };
              })
            : row.photos ?? [],
        },
      ]),
      createSection("Rastreamento", [
        { label: "Origem", value: formatSource(row.source) },
        { label: "Enviado em", value: formatDateTime(row.submittedAt) },
        { label: "Criado em", value: formatDateTime(row.createdAt) },
        { label: "Atualizado em", value: formatDateTime(row.updatedAt) },
        { label: "Request ID", value: formatText(row.requestId) },
        { label: "Origem da request", value: formatText(row.requestOrigin) },
        { label: "Hash do IP", value: formatText(row.requestIpHash) },
        { label: "User agent", value: formatText(row.userAgent) },
        { label: "Metadata", value: row.metadata ?? {} },
      ]),
    ],
  };
}

export async function loadAdminDatabaseTableData(
  tableId: AdminDatabaseTableId,
  options: AdminDatabaseLoadOptions = {},
  env: ServerEnv = getServerEnv(),
): Promise<AdminDatabaseTableData> {
  const table = adminDatabaseTables[tableId];
  const normalizedOptions: AdminDatabaseLoadOptions = {
    ...options,
    visibleTableIds: getNormalizedVisibleTableIds(options),
  };

  if (!isTableAllowedByLoadOptions(tableId, normalizedOptions)) {
    return buildAdminDatabaseTableForbidden(table);
  }

  const intakeScope = await resolveEventFighterIntakeScope(normalizedOptions);

  if (!isDatabaseConfigured(env) && isAdminReadUpstreamConfigured(env)) {
    const upstreamTable = await loadAdminDatabaseTableFromUpstream(
      tableId,
      normalizedOptions,
      env,
    );

    if (upstreamTable) {
      return upstreamTable;
    }
  }

  if (!isDatabaseConfigured(env)) {
    return buildAdminDatabaseTableUnavailable(table);
  }

  switch (tableId) {
    case "contact-messages":
      return loadContactMessagesTableDataDirect();
    case "newsletter-subscriptions":
      return loadNewsletterSubscriptionsTableDataDirect();
    case "partner-inquiries":
      return loadPartnerInquiriesTableDataDirect();
    case "fighter-applications":
      return loadFighterApplicationsTableDataDirect();
    case "event-fighter-intakes":
      return loadEventFighterIntakesTableDataDirect(intakeScope);
    case "fantasy-entries":
      return loadFantasyEntriesTableDataDirect();
  }
}

export async function loadAdminDatabaseRecordData(
  tableId: AdminDatabaseTableId,
  rowId: string,
  options: AdminDatabaseLoadOptions = {},
  env: ServerEnv = getServerEnv(),
): Promise<AdminDatabaseRecordData | null> {
  const table = adminDatabaseTables[tableId];
  const normalizedOptions: AdminDatabaseLoadOptions = {
    ...options,
    visibleTableIds: getNormalizedVisibleTableIds(options),
  };

  if (!isTableAllowedByLoadOptions(tableId, normalizedOptions)) {
    return null;
  }

  const intakeScope = await resolveEventFighterIntakeScope(normalizedOptions);

  if (!isDatabaseConfigured(env) && isAdminReadUpstreamConfigured(env)) {
    const upstreamRecord = await loadAdminDatabaseRecordFromUpstream(
      tableId,
      rowId,
      normalizedOptions,
      env,
    );

    if (upstreamRecord) {
      return upstreamRecord;
    }
  }

  if (!isDatabaseConfigured(env)) {
    return buildAdminDatabaseRecordUnavailable(table, rowId);
  }

  switch (tableId) {
    case "contact-messages":
      return loadContactMessageRecordDirect(rowId);
    case "newsletter-subscriptions":
      return loadNewsletterRecordDirect(rowId);
    case "partner-inquiries":
      return loadPartnerInquiryRecordDirect(rowId);
    case "fighter-applications":
      return loadFighterApplicationRecordDirect(rowId);
    case "event-fighter-intakes":
      return loadEventFighterIntakeRecordDirect(rowId, intakeScope);
    case "fantasy-entries":
      return loadFantasyEntryRecordDirect(rowId);
  }
}
