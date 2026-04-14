import "server-only";

import type { FantasyEntryPayload, FantasyPickPayload } from "@/lib/contracts/fantasy";
import {
  BRAZILIAN_STATES,
  type FantasyEntryPublicResponse
} from "@/lib/contracts/fantasy";
import type {
  FantasyMockEntry,
  FantasyMockEvent,
  FantasyMockFight
} from "@/lib/fantasy/mock-data";
import { queryDatabase, withDatabaseTransaction } from "@/lib/server/database";
import {
  getServerEnv,
  isDatabaseConfigured,
  isUpstreamConfigured,
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

const stateCodeToName = new Map<string, (typeof BRAZILIAN_STATES)[number]["name"]>(
  BRAZILIAN_STATES.map((state) => [state.code, state.name])
);
const stateNameToCode = new Map<string, string>(
  BRAZILIAN_STATES.map((state) => [state.name, state.code])
);

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
  if (!isUpstreamConfigured(env)) {
    return null;
  }

  try {
    return await getJsonFromUpstream<{ events: FantasyMockEvent[] }>(
      `${env.upstreamApiBaseUrl}${env.fantasyEventsPath}`,
      {
        bearerToken: env.upstreamApiBearerToken!,
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
          red_f.display_name as "redCornerName",
          red_f.country_name as "redCornerCountry",
          red_f.image_url as "redCornerImageUrl",
          blue_ef.id as "blueCornerId",
          blue_f.display_name as "blueCornerName",
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

export async function submitFantasyEntry(
  payload: FantasyEntryPayload,
  requestContext: RequestAuditContext,
  env: ServerEnv = getServerEnv()
): Promise<FantasyEntryPublicResponse | null> {
  if (!isDatabaseConfigured(env)) {
    if (!isUpstreamConfigured(env)) {
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
          bearerToken: env.upstreamApiBearerToken!,
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
