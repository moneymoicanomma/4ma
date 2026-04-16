import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

import { type NextRequest } from "next/server";

import { publicApiResponse } from "@/lib/server/api-response";
import { withDatabaseTransaction } from "@/lib/server/database";
import { getServerEnv, isDatabaseConfigured } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 1000;
const FINANCE_EXPORT_KEY = "event_fighter_intakes_financeiro";
const FINANCE_EXPORT_SHEET_NAME = "financeiro_intakes_atletas";
const FINANCE_EXPORT_COLUMNS = [
  "id",
  "event_name",
  "fighter_name",
  "event_fighter_id",
  "submitted_by_account_id",
  "full_name",
  "nickname",
  "email",
  "phone_whatsapp",
  "birth_date",
  "cpf",
  "cpf_last4",
  "pix_key_type",
  "pix_key",
  "pix_key_last4",
  "has_health_insurance",
  "health_insurance_provider",
  "record_summary",
  "category",
  "height",
  "reach",
  "city",
  "state_code",
  "education_level",
  "team",
  "coach_name",
  "fight_graduations",
  "coach_contact",
  "manager_name",
  "manager_contact",
  "corner_one_name",
  "corner_two_name",
  "primary_specialty",
  "additional_specialties",
  "competition_history",
  "titles_won",
  "life_story",
  "funny_story",
  "curiosities",
  "hobbies",
  "tapology_profile",
  "instagram_profile",
  "source",
  "intake_status",
  "reviewed_by_account_id",
  "reviewed_at",
  "staff_notes",
  "request_id",
  "request_origin",
  "user_agent",
  "metadata",
  "submitted_at",
  "created_at",
  "updated_at",
] as const;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest();
}

function safeCompareText(left: string, right: string) {
  return timingSafeEqual(hashToken(left), hashToken(right));
}

function parsePositiveInteger(value: string | null, fallback: number, maxValue = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.min(parsed, maxValue);
}

function getExpectedExportBearer(tableKey: string) {
  const sharedToken = process.env.GOOGLE_SHEETS_EXPORT_BEARER_TOKEN?.trim() || null;

  if (tableKey === FINANCE_EXPORT_KEY) {
    return process.env.GOOGLE_SHEETS_FINANCE_EXPORT_BEARER_TOKEN?.trim() || sharedToken;
  }

  return sharedToken;
}

function isExportRequestAuthorized(request: NextRequest, tableKey: string) {
  const expectedToken = getExpectedExportBearer(tableKey);

  if (!expectedToken) {
    return false;
  }

  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme !== "Bearer" || !token) {
    return false;
  }

  return safeCompareText(token, expectedToken);
}

async function loadFinanceExportPage(limit: number, offset: number) {
  const result = await withDatabaseTransaction<Record<string, unknown>[]>(
    {
      actorRole: "service",
      requestId: `next-google-sheets-finance-export-${offset}-${randomUUID()}`,
      origin: "next-google-sheets-export",
      userAgent: "next-google-sheets-export",
    },
    async (transaction) => {
      const queryResult = await transaction.query<Record<string, unknown>>(
        `
          select
            intake.id,
            event.name as event_name,
            fighter.display_name as fighter_name,
            intake.event_fighter_id,
            intake.submitted_by_account_id,
            intake.full_name,
            intake.nickname,
            intake.email,
            intake.phone_whatsapp,
            intake.birth_date::text as birth_date,
            app.decrypt_secret(intake.cpf_ciphertext) as cpf,
            intake.cpf_last4,
            intake.pix_key_type::text as pix_key_type,
            app.decrypt_secret(intake.pix_key_ciphertext) as pix_key,
            intake.pix_key_last4,
            intake.has_health_insurance,
            intake.health_insurance_provider,
            intake.record_summary,
            intake.category,
            intake.height,
            intake.reach,
            intake.city,
            intake.state_code,
            intake.education_level,
            intake.team,
            intake.coach_name,
            intake.fight_graduations,
            intake.coach_contact,
            intake.manager_name,
            intake.manager_contact,
            intake.corner_one_name,
            intake.corner_two_name,
            intake.primary_specialty,
            intake.additional_specialties,
            intake.competition_history,
            intake.titles_won,
            intake.life_story,
            intake.funny_story,
            intake.curiosities,
            intake.hobbies,
            intake.tapology_profile,
            intake.instagram_profile,
            intake.source,
            intake.intake_status::text as intake_status,
            intake.reviewed_by_account_id,
            intake.reviewed_at,
            intake.staff_notes,
            intake.request_id,
            intake.request_origin,
            intake.user_agent,
            intake.metadata,
            intake.submitted_at,
            intake.created_at,
            intake.updated_at
          from app.event_fighter_intakes intake
          left join app.event_fighters event_fighter
            on event_fighter.id = intake.event_fighter_id
          left join app.events event
            on event.id = event_fighter.event_id
          left join app.fighters fighter
            on fighter.id = event_fighter.fighter_id
          order by intake.submitted_at desc
          limit $1
          offset $2
        `,
        [limit, offset],
      );

      return queryResult.rows;
    },
    {
      requiresEncryptionKey: true,
    },
  );

  return {
    key: FINANCE_EXPORT_KEY,
    sheetName: FINANCE_EXPORT_SHEET_NAME,
    columns: [...FINANCE_EXPORT_COLUMNS],
    rows: result,
  };
}

type RouteContext = {
  params: Promise<{
    tableKey: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { tableKey } = await context.params;

  if (tableKey !== FINANCE_EXPORT_KEY) {
    return publicApiResponse(
      {
        ok: false,
        message: "Export nao encontrado.",
      },
      {
        status: 404,
      },
    );
  }

  if (!isExportRequestAuthorized(request, tableKey)) {
    return publicApiResponse(
      {
        ok: false,
        message: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  const env = getServerEnv();

  if (!isDatabaseConfigured(env)) {
    return publicApiResponse(
      {
        ok: false,
        message: "Database export indisponivel neste ambiente.",
      },
      {
        status: 503,
      },
    );
  }

  const limit = parsePositiveInteger(request.nextUrl.searchParams.get("limit"), MAX_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = parsePositiveInteger(request.nextUrl.searchParams.get("offset"), 0);

  try {
    const payload = await loadFinanceExportPage(limit, offset);

    return publicApiResponse({
      ok: true,
      export: payload,
    });
  } catch (error) {
    console.error("[next/google-sheets-export] finance export failed", {
      error,
      tableKey,
      limit,
      offset,
    });

    return publicApiResponse(
      {
        ok: false,
        message: "Servico temporariamente indisponivel.",
      },
      {
        status: 503,
      },
    );
  }
}
