import "server-only";

import { queryDatabase } from "@/lib/server/database";
import { getJsonFromUpstream } from "@/lib/server/http";
import {
  getServerEnv,
  isDatabaseConfigured,
  isUpstreamConfigured,
  type ServerEnv,
} from "@/lib/server/env";

const TABLE_PREVIEW_LIMIT = 6;

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

type DateValue = string | Date | null | undefined;

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

async function loadEventFighterIntakesTable() {
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

  return withTableFallback(config, async () => {
    const [summary, statusCounts, result] = await Promise.all([
      loadTableSummary(
        `
          select
            count(*)::int as "totalRows",
            max(updated_at) as "lastActivityAt"
          from app.event_fighter_intakes
        `,
      ),
      loadStatusCounts(
        `
          select
            intake_status as status,
            count(*)::int as total
          from app.event_fighter_intakes
          group by intake_status
          order by count(*) desc, intake_status asc
        `,
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
          left join lateral (
            select count(*)::int as total
            from app.event_fighter_intake_photos photo
            where photo.intake_id = intake.id
          ) photo_counts on true
          order by intake.submitted_at desc
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
  env: ServerEnv = getServerEnv(),
): Promise<AdminDatabaseOverview> {
  if (!isDatabaseConfigured(env) && isUpstreamConfigured(env)) {
    try {
      return await getJsonFromUpstream<AdminDatabaseOverview>(
        `${env.upstreamApiBaseUrl}${env.adminDatabaseOverviewPath}`,
        {
          bearerToken: env.upstreamApiBearerToken!,
          timeoutMs: env.upstreamRequestTimeoutMs,
        },
      );
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
      tables: [],
      availableTables: 0,
      unavailableTables: 0,
    };
  }

  const tables = await Promise.all([
    loadContactMessagesTable(),
    loadNewsletterSubscriptionsTable(),
    loadPartnerInquiriesTable(),
    loadFighterApplicationsTable(),
    loadEventFighterIntakesTable(),
    loadFantasyEntriesTable(),
  ]);

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
