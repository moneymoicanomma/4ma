import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const fantasyContractSource = readFileSync(
  new URL("../lib/contracts/fantasy.ts", import.meta.url),
  "utf8"
);
const fantasyExperienceSource = readFileSync(
  new URL("../app/components/fantasy-experience.tsx", import.meta.url),
  "utf8"
);
const fantasyAdminSource = readFileSync(
  new URL("../app/components/fantasy-admin-dashboard.tsx", import.meta.url),
  "utf8"
);
const fantasyServerSource = readFileSync(new URL("../lib/server/fantasy.ts", import.meta.url), "utf8");
const lambdaApiSource = readFileSync(new URL("../lambda/mmmma-api/index.mjs", import.meta.url), "utf8");
const fightPickStatusMigrationUrl = new URL(
  "../db/migrations/0018_fantasy_fight_pick_status.sql",
  import.meta.url
);
const fightPickStatusMigrationSource = existsSync(fightPickStatusMigrationUrl)
  ? readFileSync(fightPickStatusMigrationUrl, "utf8")
  : "";

describe("fantasy fight pick status", () => {
  it("defines open and closed pick status on fantasy fights", () => {
    assert.ok(fantasyContractSource.includes('FANTASY_FIGHT_PICK_STATUSES = ["open", "closed"]'));
    assert.ok(fantasyContractSource.includes("type FantasyFightPickStatus"));
    assert.ok(fantasyContractSource.includes("pickStatus: FantasyFightPickStatus"));
    assert.ok(fantasyContractSource.includes("isFantasyFightPickOpen"));
  });

  it("lets the public submit only currently open fights", () => {
    assert.ok(fantasyExperienceSource.includes("openFights"));
    assert.ok(fantasyExperienceSource.includes("isFantasyFightPickOpen(currentEvent.status, fight)"));
    assert.ok(fantasyExperienceSource.includes("Complete todas as lutas abertas"));
    assert.ok(fantasyExperienceSource.includes("Picks fechados"));
  });

  it("preserves locked picks while replacing only open fight picks in the backend", () => {
    assert.ok(fantasyServerSource.includes("pickStatus: FantasyMockFight[\"pickStatus\"]"));
    assert.ok(fantasyServerSource.includes("pick_status as \"pickStatus\""));
    assert.ok(fantasyServerSource.includes("openFightIds"));
    assert.ok(fantasyServerSource.includes("pick_status = 'open'"));
    assert.ok(fantasyServerSource.includes("return upstreamPayload ?? null;"));
    assert.ok(
      fantasyServerSource.includes(
        "delete from app.fantasy_picks where fantasy_entry_id = $1 and fight_id = any($2::uuid[])"
      )
    );
  });

  it("keeps the Lambda fantasy endpoints in sync with fight pick status", () => {
    assert.ok(lambdaApiSource.includes("FANTASY_FIGHT_PICK_STATUS_VALUES"));
    assert.ok(lambdaApiSource.includes("pick_status as \"pickStatus\""));
    assert.ok(lambdaApiSource.includes("pickStatus: row.pickStatus ?? \"open\""));
    assert.ok(lambdaApiSource.includes("openFightIds"));
    assert.ok(lambdaApiSource.includes("pick_status = 'open'"));
    assert.ok(
      lambdaApiSource.includes(
        "delete from app.fantasy_picks where fantasy_entry_id = $1 and fight_id = any($2::uuid[])"
      )
    );
  });

  it("adds a per-fight admin control beside official results", () => {
    assert.ok(fantasyAdminSource.includes("updateFightPickStatus"));
    assert.ok(fantasyAdminSource.includes("Abrir picks"));
    assert.ok(fantasyAdminSource.includes("Fechar picks"));
    assert.ok(fantasyAdminSource.includes("Aberta para picks"));
    assert.ok(fantasyAdminSource.includes("Fechada para picks"));
  });

  it("adds a database migration for fight pick status", () => {
    assert.ok(fightPickStatusMigrationSource.includes("fight_pick_status_enum"));
    assert.ok(fightPickStatusMigrationSource.includes("alter table app.fights"));
    assert.ok(fightPickStatusMigrationSource.includes("pick_status"));
    assert.ok(fightPickStatusMigrationSource.includes("ensure_fantasy_pick_matches_fight"));
  });
});
