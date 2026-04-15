import "server-only";

import { randomUUID } from "node:crypto";

import type { FantasyEntryPayload, FantasyPickPayload } from "@/lib/contracts/fantasy";
import {
  BRAZILIAN_STATES,
  type FantasyEntryPublicResponse
} from "@/lib/contracts/fantasy";
import { getBrazilianStateCode } from "@/lib/contracts/brazilian-states";
import type {
  FantasyScoringRules,
  FantasyMockEntry,
  FantasyMockEvent,
  FantasyMockFight
} from "@/lib/fantasy/mock-data";
import type { AdminSessionIdentity } from "@/lib/server/admin-session";
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseTransaction
} from "@/lib/server/database";
import {
  getAdminReadUpstreamBearerToken,
  getAdminWriteUpstreamBearerToken,
  getPublicWriteUpstreamBearerToken,
  getServerEnv,
  isAdminReadUpstreamConfigured,
  isAdminWriteUpstreamConfigured,
  isDatabaseConfigured,
  isPublicUpstreamConfigured,
  type ServerEnv
} from "@/lib/server/env";
import { getJsonFromUpstream, postJsonToUpstream } from "@/lib/server/http";
import type { RequestAuditContext } from "@/lib/server/request-context";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  status: "draft" | "published" | "locked" | "finished";
  startsAt: string;
  lockAt: string;
  venue: string;
  cityName: string;
  stateCode: string | null;
  heroLabel: string;
  broadcastLabel: string;
  statusText: string;
  winnerPoints: number;
  methodPoints: number;
  roundPoints: number;
  perfectPickBonus: number;
};

type FightRow = {
  id: string;
  eventId: string;
  order: number;
  label: string;
  maxRound: 3 | 5;
  redCornerId: string;
  redCornerName: string;
  redCornerCountry: string;
  redCornerImageUrl: string | null;
  blueCornerId: string;
  blueCornerName: string;
  blueCornerCountry: string;
  blueCornerImageUrl: string | null;
  winnerId: string | null;
  victoryMethod: FantasyMockFight["result"]["victoryMethod"];
  round: FantasyMockFight["result"]["round"];
};

type EntryRow = {
  id: string;
  eventId: string;
  displayName: string;
  fullName: string;
  email: string;
  whatsapp: string;
  city: string;
  stateCode: string;
  submittedAt: string;
  fightId: string | null;
  fighterId: string | null;
  victoryMethod: FantasyPickPayload["victoryMethod"] | null;
  round: FantasyPickPayload["round"] | null;
};

type FantasyAdminSaveResponse =
  | {
      ok: true;
      message: string;
      event: FantasyMockEvent;
    }
  | {
      ok: false;
      message: string;
    };

type NormalizedFantasyAdminCorner = {
  id: string | null;
  originalId: string;
  name: string;
  country: string;
};

type NormalizedFantasyAdminFight = {
  id: string | null;
  order: number;
  label: string;
  maxRound: 3 | 5;
  redCorner: NormalizedFantasyAdminCorner;
  blueCorner: NormalizedFantasyAdminCorner;
  result:
    | {
        winnerSide: "red" | "blue";
        victoryMethod: NonNullable<FantasyMockFight["result"]["victoryMethod"]>;
        round: NonNullable<FantasyMockFight["result"]["round"]>;
      }
    | null;
};

type NormalizedFantasyAdminEvent = {
  id: string | null;
  slug: string;
  name: string;
  status: FantasyMockEvent["status"];
  startsAt: string;
  lockAt: string;
  venue: string;
  cityName: string;
  stateCode: string | null;
  heroLabel: string;
  broadcastLabel: string;
  statusText: string;
  scoringRules: FantasyScoringRules;
  fights: NormalizedFantasyAdminFight[];
};

class FantasyAdminEventSaveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FantasyAdminEventSaveValidationError";
  }
}

const stateCodeToName = new Map<string, (typeof BRAZILIAN_STATES)[number]["name"]>(
  BRAZILIAN_STATES.map((state) => [state.code, state.name])
);
const stateNameToCode = new Map<string, string>(
  BRAZILIAN_STATES.map((state) => [state.name, state.code])
);
const fantasyStatusSet = new Set<FantasyMockEvent["status"]>([
  "draft",
  "published",
  "locked",
  "finished"
]);
const fantasyVictoryMethodSet = new Set<NonNullable<FantasyMockFight["result"]["victoryMethod"]>>([
  "decisao",
  "finalizacao",
  "nocaute"
]);
const fantasyRoundSet = new Set<NonNullable<FantasyMockFight["result"]["round"]>>([
  1,
  2,
  3,
  4,
  5
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeShortText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeSlug(input: unknown, fallback: string) {
  const base = normalizeShortText(input) || fallback;

  return base
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && uuidPattern.test(value));
}

function ensureRequiredText(value: string, label: string, minimumLength = 1) {
  if (value.length < minimumLength) {
    throw new FantasyAdminEventSaveValidationError(`${label} precisa ser preenchido.`);
  }

  return value;
}

function parseAdminEventDate(value: string, label: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new FantasyAdminEventSaveValidationError(`${label} está com uma data inválida.`);
  }

  return date.toISOString();
}

function parseCityLabel(value: string) {
  const normalized = ensureRequiredText(normalizeShortText(value), "Cidade / Estado", 2);
  const [cityPart, statePart] = normalized.split(",").map((part) => part.trim());
  const stateCode = statePart ? getBrazilianStateCode(statePart) || null : null;

  return {
    cityName: ensureRequiredText(cityPart || normalized, "Cidade / Estado", 2),
    stateCode
  };
}

function normalizeScoringRules(input: FantasyMockEvent["scoringRules"] | undefined): FantasyScoringRules {
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

function normalizeFightCorner(
  corner: FantasyMockFight["redCorner"] | FantasyMockFight["blueCorner"],
  fallbackPrefix: string
): NormalizedFantasyAdminCorner {
  const originalId = normalizeShortText(corner?.id) || `${fallbackPrefix}-${randomUUID()}`;

  return {
    id: isUuid(corner?.id ?? "") ? corner.id : null,
    originalId,
    name: ensureRequiredText(normalizeShortText(corner?.name), "Nome do atleta", 2),
    country: ensureRequiredText(normalizeShortText(corner?.country) || "Brasil", "País", 2)
  };
}

function normalizeFightResult(
  fight: FantasyMockFight,
  redCornerOriginalId: string,
  blueCornerOriginalId: string
) {
  const winnerId = normalizeShortText(fight.result.winnerId);
  const victoryMethod = normalizeShortText(fight.result.victoryMethod);
  const round = Number(fight.result.round);

  if (!winnerId && !victoryMethod && !fight.result.round) {
    return null;
  }

  if (!winnerId || !fantasyVictoryMethodSet.has(victoryMethod as NonNullable<FantasyMockFight["result"]["victoryMethod"]>) || !fantasyRoundSet.has(round as NonNullable<FantasyMockFight["result"]["round"]>)) {
    throw new FantasyAdminEventSaveValidationError(
      "O resultado oficial precisa ter vencedor, método e round válidos."
    );
  }

  const winnerSide: "red" | "blue" | null =
    winnerId === redCornerOriginalId ? "red" : winnerId === blueCornerOriginalId ? "blue" : null;

  if (!winnerSide) {
    throw new FantasyAdminEventSaveValidationError(
      "O vencedor oficial precisa ser um dos atletas da luta."
    );
  }

  if (round > fight.maxRound) {
    throw new FantasyAdminEventSaveValidationError(
      "O round oficial não pode ser maior que o total de rounds da luta."
    );
  }

  return {
    winnerSide,
    victoryMethod: victoryMethod as NonNullable<FantasyMockFight["result"]["victoryMethod"]>,
    round: round as NonNullable<FantasyMockFight["result"]["round"]>
  };
}

function normalizeFantasyAdminEvent(event: FantasyMockEvent): NormalizedFantasyAdminEvent {
  const name = ensureRequiredText(normalizeShortText(event.name), "Nome do evento", 3);
  const slug = normalizeSlug(event.slug, name);

  if (!slug) {
    throw new FantasyAdminEventSaveValidationError("Slug do evento inválido.");
  }

  const startsAt = parseAdminEventDate(event.startsAt, "Início do evento");
  const lockAt = parseAdminEventDate(event.lockAt, "Lock das picks");

  if (new Date(lockAt).getTime() > new Date(startsAt).getTime()) {
    throw new FantasyAdminEventSaveValidationError(
      "O lock das picks precisa acontecer antes do início do evento."
    );
  }

  if (!fantasyStatusSet.has(event.status)) {
    throw new FantasyAdminEventSaveValidationError("Status do evento inválido.");
  }

  const city = parseCityLabel(event.cityLabel);
  const fights = event.fights.map((fight, index) => {
    const maxRound: 3 | 5 = fight.maxRound === 5 ? 5 : 3;
    const redCorner = normalizeFightCorner(fight.redCorner, `red-${index + 1}`);
    const blueCorner = normalizeFightCorner(fight.blueCorner, `blue-${index + 1}`);

    if (redCorner.originalId === blueCorner.originalId) {
      throw new FantasyAdminEventSaveValidationError(
        "Cada luta precisa ter dois atletas diferentes."
      );
    }

    const normalizedFight: FantasyMockFight = {
      ...fight,
      maxRound,
      redCorner: {
        ...fight.redCorner,
        id: redCorner.originalId
      },
      blueCorner: {
        ...fight.blueCorner,
        id: blueCorner.originalId
      }
    };

    return {
      id: isUuid(fight.id) ? fight.id : null,
      order: index + 1,
      label: ensureRequiredText(normalizeShortText(fight.label), "Categoria da luta", 2),
      maxRound,
      redCorner,
      blueCorner,
      result: normalizeFightResult(normalizedFight, redCorner.originalId, blueCorner.originalId)
    };
  });

  return {
    id: isUuid(event.id) ? event.id : null,
    slug,
    name,
    status: event.status,
    startsAt,
    lockAt,
    venue: ensureRequiredText(normalizeShortText(event.venue), "Venue", 2),
    cityName: city.cityName,
    stateCode: city.stateCode,
    heroLabel: normalizeShortText(event.heroLabel) || "Fantasy oficial do card",
    broadcastLabel: normalizeShortText(event.broadcastLabel) || "Canal Money Moicano",
    statusText: normalizeShortText(event.statusText),
    scoringRules: normalizeScoringRules(event.scoringRules),
    fights
  };
}

async function ensureFantasyScoringProfile(
  transaction: DatabaseTransaction,
  scoringRules: FantasyScoringRules,
  actorAccountId: string | null
) {
  const existingProfileResult = await transaction.query<{ id: string }>(
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
  const insertResult = await transaction.query<{ id: string }>(
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

  return insertResult.rows[0]!.id;
}

async function upsertFantasyCorner(
  transaction: DatabaseTransaction,
  eventId: string,
  corner: NormalizedFantasyAdminCorner
) {
  if (corner.id) {
    const existingCornerResult = await transaction.query<{ id: string; fighterId: string }>(
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
      await transaction.query(
        `
          update app.event_fighters
          set
            card_name = $2,
            updated_at = now()
          where id = $1::uuid
        `,
        [existingCorner.id, corner.name]
      );

      await transaction.query(
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
  const fighterSlug = `${normalizeSlug(corner.name, "fighter") || "fighter"}-${fighterId.slice(0, 8)}`;
  const eventFighterId = randomUUID();

  await transaction.query(
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

  await transaction.query(
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

async function persistFantasyEvent(
  event: FantasyMockEvent,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<FantasyAdminSaveResponse | null> {
  const normalizedEvent = normalizeFantasyAdminEvent(event);
  const actorAccountId = identity.kind === "account" ? identity.accountId : null;

  if (!isDatabaseConfigured(env)) {
    if (!isAdminWriteUpstreamConfigured(env)) {
      return null;
    }

    try {
      const response = await postJsonToUpstream(
        `${env.upstreamApiBaseUrl}${env.adminFantasyEventsPath}`,
        {
          payload: event,
          actor: {
            accountId: actorAccountId,
            email: identity.username,
            role: identity.role
          },
          requestContext
        },
        {
          bearerToken: getAdminWriteUpstreamBearerToken(env)!,
          timeoutMs: env.upstreamRequestTimeoutMs
        }
      );

      const upstreamPayload =
        (await response.json().catch(() => null)) as FantasyAdminSaveResponse | null;

      return upstreamPayload?.ok ? upstreamPayload : null;
    } catch (error) {
      if (error instanceof FantasyAdminEventSaveValidationError) {
        throw error;
      }

      return null;
    }
  }

  const savedEventId = await withDatabaseTransaction(
    {
      actorId: actorAccountId,
      actorRole: identity.role,
      actorEmail: identity.username,
      requestId: requestContext.requestId,
      clientIp: requestContext.clientIp,
      origin: requestContext.requestOrigin,
      userAgent: requestContext.userAgent
    },
    async (transaction) => {
      const scoringProfileId = await ensureFantasyScoringProfile(
        transaction,
        normalizedEvent.scoringRules,
        actorAccountId
      );

      const existingEventResult = normalizedEvent.id
        ? await transaction.query<{ id: string; publishedAt: string | null; finishedAt: string | null }>(
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
        : { rows: [] as Array<{ id: string; publishedAt: string | null; finishedAt: string | null }> };
      const existingEvent = existingEventResult.rows[0] ?? null;
      const eventId = existingEvent?.id ?? normalizedEvent.id ?? randomUUID();
      const publishedAt =
        normalizedEvent.status === "draft" ? null : existingEvent?.publishedAt ?? new Date().toISOString();
      const finishedAt =
        normalizedEvent.status === "finished"
          ? existingEvent?.finishedAt ?? new Date().toISOString()
          : null;

      await transaction.query(
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
          eventId,
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

      const persistedFightIds: string[] = [];

      for (const fight of normalizedEvent.fights) {
        const redCornerEventFighterId = await upsertFantasyCorner(
          transaction,
          eventId,
          fight.redCorner
        );
        const blueCornerEventFighterId = await upsertFantasyCorner(
          transaction,
          eventId,
          fight.blueCorner
        );

        if (redCornerEventFighterId === blueCornerEventFighterId) {
          throw new FantasyAdminEventSaveValidationError(
            "Uma luta não pode usar o mesmo atleta nos dois corners."
          );
        }

        const existingFightResult = fight.id
          ? await transaction.query<{ id: string }>(
              `
                select id
                from app.fights
                where id = $1::uuid
                  and event_id = $2::uuid
                limit 1
              `,
              [fight.id, eventId]
            )
          : { rows: [] as Array<{ id: string }> };
        const fightId = existingFightResult.rows[0]?.id ?? fight.id ?? randomUUID();
        const winnerEventFighterId =
          fight.result?.winnerSide === "red"
            ? redCornerEventFighterId
            : fight.result?.winnerSide === "blue"
              ? blueCornerEventFighterId
              : null;

        await transaction.query(
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
            eventId,
            fight.order,
            fight.label,
            fight.maxRound,
            redCornerEventFighterId,
            blueCornerEventFighterId
          ]
        );

        if (fight.result && winnerEventFighterId) {
          await transaction.query(
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
          await transaction.query("delete from app.fight_results where fight_id = $1::uuid", [fightId]);
        }

        persistedFightIds.push(fightId);
      }

      if (persistedFightIds.length) {
        await transaction.query(
          `
            delete from app.fights
            where event_id = $1::uuid
              and not (id = any($2::uuid[]))
          `,
          [eventId, persistedFightIds]
        );
      } else {
        await transaction.query("delete from app.fights where event_id = $1::uuid", [eventId]);
      }

      await transaction.query(
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
        [eventId]
      );

      return eventId;
    }
  );

  const refreshed = await loadFantasyEventsFromDatabase(env);
  const savedEvent = refreshed?.events.find((currentEvent) => currentEvent.id === savedEventId) ?? null;

  if (!savedEvent) {
    return null;
  }

  return {
    ok: true,
    message: "Evento salvo no banco com sucesso.",
    event: savedEvent
  };
}

function buildCityLabel(cityName: string, stateCode: string | null) {
  return stateCode ? `${cityName}, ${stateCode}` : cityName;
}

function mapEntryState(stateCode: string) {
  return stateCodeToName.get(stateCode) ?? "São Paulo";
}

function buildEventSkeleton(row: EventRow): FantasyMockEvent {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    startsAt: row.startsAt,
    lockAt: row.lockAt,
    status: row.status,
    venue: row.venue,
    cityLabel: buildCityLabel(row.cityName, row.stateCode),
    heroLabel: row.heroLabel,
    broadcastLabel: row.broadcastLabel,
    statusText: row.statusText,
    scoringRules: {
      winner: row.winnerPoints,
      method: row.methodPoints,
      round: row.roundPoints,
      perfectPickBonus: row.perfectPickBonus
    },
    fights: [],
    entries: []
  };
}

async function loadFantasyEventsFromUpstream(env: ServerEnv) {
  if (!isAdminReadUpstreamConfigured(env)) {
    return null;
  }

  try {
    return await getJsonFromUpstream<{ events: FantasyMockEvent[] }>(
      `${env.upstreamApiBaseUrl}${env.fantasyEventsPath}`,
      {
        bearerToken: getAdminReadUpstreamBearerToken(env)!,
        timeoutMs: env.upstreamRequestTimeoutMs
      }
    );
  } catch (error) {
    console.error("[fantasy] failed to load events from upstream", error);
    return null;
  }
}

export async function loadFantasyEventsFromDatabase(env: ServerEnv = getServerEnv()) {
  if (!isDatabaseConfigured(env)) {
    return loadFantasyEventsFromUpstream(env);
  }

  try {
    const eventResult = await queryDatabase<EventRow>(
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
        order by e.starts_at desc, e.created_at desc
      `
    );

    if (!eventResult.rowCount) {
      return {
        events: [] as FantasyMockEvent[]
      };
    }

    const eventIds = eventResult.rows.map((row: EventRow) => row.id);
    const events = new Map<string, FantasyMockEvent>();

    for (const row of eventResult.rows) {
      events.set(row.id, buildEventSkeleton(row));
    }

    const fightResult = await queryDatabase<FightRow>(
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

    const entryResult = await queryDatabase<EntryRow>(
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

    const entryMap = new Map<string, FantasyMockEntry>();

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
          state: mapEntryState(row.stateCode),
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
      events: eventResult.rows
        .map((row: EventRow) => events.get(row.id))
        .filter((event: FantasyMockEvent | undefined): event is FantasyMockEvent =>
          Boolean(event)
        )
    };
  } catch (error) {
    console.error("[fantasy] failed to load events from database", error);
    return loadFantasyEventsFromUpstream(env);
  }
}

export async function saveFantasyEvent(
  event: FantasyMockEvent,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
) {
  return persistFantasyEvent(event, identity, requestContext, env);
}

export async function submitFantasyEntry(
  payload: FantasyEntryPayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<FantasyEntryPublicResponse | null> {
  if (!isDatabaseConfigured(env)) {
    if (!isPublicUpstreamConfigured(env)) {
      return null;
    }

    try {
      const response = await postJsonToUpstream(
        `${env.upstreamApiBaseUrl}${env.fantasyEntrySubmitPath}`,
        {
          payload,
          requestContext
        },
        {
          bearerToken: getPublicWriteUpstreamBearerToken(env)!,
          timeoutMs: env.upstreamRequestTimeoutMs
        }
      );

      const upstreamPayload =
        (await response.json().catch(() => null)) as FantasyEntryPublicResponse | null;

      return upstreamPayload?.ok ? upstreamPayload : null;
    } catch {
      return null;
    }
  }

  const stateCode = stateNameToCode.get(payload.state);

  if (!stateCode) {
    throw new Error("Unsupported state for fantasy entry.");
  }

  return withDatabaseTransaction(
    {
      actorRole: "public",
      actorEmail: payload.email,
      requestId: requestContext.requestId,
      clientIp: requestContext.clientIp,
      origin: requestContext.requestOrigin,
      userAgent: requestContext.userAgent
    },
    async (transaction) => {
      const entryResult = await transaction.query<{
        id: string;
        referenceCode: string;
        submittedAt: string;
      }>(
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
          payload.eventId,
          payload.fullName,
          payload.email,
          payload.whatsapp,
          payload.city,
          stateCode,
          payload.marketingConsent,
          payload.source,
          requestContext.requestId,
          requestContext.requestOrigin,
          requestContext.requestIpHash,
          requestContext.userAgent,
          JSON.stringify({
            surface: "fantasy-entry"
          })
        ]
      );

      const entry = entryResult.rows[0]!;

      await transaction.query("delete from app.fantasy_picks where fantasy_entry_id = $1", [entry.id]);

      for (const pick of payload.picks) {
        await transaction.query(
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
          [entry.id, pick.fightId, pick.fighterId, pick.victoryMethod, pick.round]
        );
      }

      return {
        ok: true,
        message: "Picks enviados. Quando o resultado oficial entrar, o ranking sobe automaticamente.",
        referenceCode: entry.referenceCode,
        submittedAt: entry.submittedAt
      };
    }
  );
}
