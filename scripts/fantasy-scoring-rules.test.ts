import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  FANTASY_ENTRY_SOURCE,
  parseFantasyEntry,
  type FantasyPickPayload
} from "../lib/contracts/fantasy";
import {
  calculateFantasyLeaderboard,
  FANTASY_SCORING_RULES,
  type FantasyMockEvent
} from "../lib/fantasy/mock-data";

function createEvent(entries: FantasyMockEvent["entries"]): FantasyMockEvent {
  return {
    id: "event-test",
    slug: "event-test",
    name: "Evento Teste",
    startsAt: "2026-05-23T20:00:00-03:00",
    lockAt: "2026-05-23T19:30:00-03:00",
    status: "finished",
    venue: "Cornerman",
    cityLabel: "São Paulo, SP",
    heroLabel: "Fantasy oficial do card",
    broadcastLabel: "Canal Money Moicano",
    statusText: "Resultados publicados.",
    scoringRules: { ...FANTASY_SCORING_RULES },
    fights: [
      {
        id: "fight-1",
        order: 1,
        label: "Peso pena",
        maxRound: 3,
        redCorner: {
          id: "fighter-red",
          name: "Lutador Vermelho",
          country: "Brasil",
          imageUrl: ""
        },
        blueCorner: {
          id: "fighter-blue",
          name: "Lutador Azul",
          country: "Brasil",
          imageUrl: ""
        },
        result: {
          winnerId: "fighter-red",
          victoryMethod: "nocaute",
          round: 2
        }
      }
    ],
    entries
  };
}

function createEntry(
  id: string,
  displayName: string,
  pickPayload: FantasyPickPayload
): FantasyMockEvent["entries"][number] {
  return {
    id,
    displayName,
    fullName: displayName,
    email: `${id}@example.com`,
    whatsapp: "(11) 99999-9999",
    city: "São Paulo",
    state: "São Paulo",
    marketingConsent: true,
    submittedAt: "2026-05-23T18:00:00-03:00",
    picks: [pickPayload]
  };
}

describe("fantasy scoring rules", () => {
  it("uses one point for winner, method, round, and perfect-pick bonus", () => {
    assert.deepEqual(FANTASY_SCORING_RULES, {
      winner: 1,
      method: 1,
      round: 1,
      perfectPickBonus: 1
    });
  });

  it("scores only winner-gated method, round, and perfect-pick points", () => {
    const leaderboard = calculateFantasyLeaderboard(
      createEvent([
        createEntry("perfect", "Perfeito", {
          fightId: "fight-1",
          fighterId: "fighter-red",
          victoryMethod: "nocaute",
          round: 2
        }),
        createEntry("winner-only", "So Vencedor", {
          fightId: "fight-1",
          fighterId: "fighter-red",
          victoryMethod: "decisao",
          round: 3
        }),
        createEntry("wrong-winner", "Errou Vencedor", {
          fightId: "fight-1",
          fighterId: "fighter-blue",
          victoryMethod: "nocaute",
          round: 2
        })
      ])
    );

    const scoresById = new Map(leaderboard.map((row) => [row.id, row.score]));
    const perfectById = new Map(leaderboard.map((row) => [row.id, row.perfectPicks]));

    assert.equal(scoresById.get("perfect"), 4);
    assert.equal(perfectById.get("perfect"), 1);
    assert.equal(scoresById.get("winner-only"), 1);
    assert.equal(scoresById.get("wrong-winner"), 0);
  });

  it("normalizes decision picks to round three before validation output", () => {
    const parsed = parseFantasyEntry({
      eventId: "event-test",
      fullName: "Pessoa Teste",
      email: "pessoa@example.com",
      whatsapp: "(11) 99999-9999",
      city: "São Paulo",
      state: "São Paulo",
      marketingConsent: true,
      source: FANTASY_ENTRY_SOURCE,
      picks: [
        {
          fightId: "fight-1",
          fighterId: "fighter-red",
          victoryMethod: "decisao"
        }
      ]
    });

    assert.equal(parsed.ok, true);

    if (parsed.ok) {
      assert.equal(parsed.data.picks[0].round, 3);
    }
  });

  it("includes the database migration for winner-gated one-point scoring", () => {
    const migrationSource = readFileSync(
      new URL("../db/migrations/0015_fantasy_scoring_rules.sql", import.meta.url),
      "utf8"
    );

    assert.ok(migrationSource.includes("winner_points = 1"));
    assert.ok(migrationSource.includes("method_points = 1"));
    assert.ok(migrationSource.includes("round_points = 1"));
    assert.ok(migrationSource.includes("perfect_pick_bonus = 1"));
    assert.ok(migrationSource.includes("victory_method = 'decisao'"));
    assert.ok(migrationSource.includes("predicted_victory_method = 'decisao'"));
    assert.ok(migrationSource.includes("fp.picked_event_fighter_id = fr.winner_event_fighter_id"));
  });

  it("maps the legacy persisted scoring profile to the new one-point rules", () => {
    const serverSource = readFileSync(new URL("../lib/server/fantasy.ts", import.meta.url), "utf8");

    assert.ok(serverSource.includes("LEGACY_FANTASY_SCORING_RULES"));
    assert.ok(serverSource.includes("isSameScoringRules(normalizedRules, LEGACY_FANTASY_SCORING_RULES)"));
    assert.ok(serverSource.includes("return { ...DEFAULT_FANTASY_SCORING_RULES };"));
    assert.ok(serverSource.includes("scoringRules: normalizeScoringRules({"));
    assert.ok(serverSource.includes("events: upstreamPayload.events.map(normalizeLoadedFantasyEvent)"));
  });
});
