import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterFighterApplicationRows,
  normalizeFighterApplicationEditorialInterest,
  parseFighterRecordFromText,
  type FighterApplicationAdminListRow,
} from "../lib/admin/fighter-application-list";

const rows: FighterApplicationAdminListRow[] = [
  {
    id: "ana",
    cells: {
      fighter: "Ana Silva / Pitbull",
      location: "Fortaleza, CE",
      cartel: "Cartel 3-1",
    },
    fighterApplication: {
      fullName: "Ana Silva",
      nickname: "Pitbull",
      city: "Fortaleza",
      stateCode: "CE",
      competitionHistory: "Cartel 3-1",
      editorialInterest: "interessante",
    },
  },
  {
    id: "joao",
    cells: {
      fighter: "João Santos",
      location: "São Paulo, SP",
      cartel: "amador 0-3",
    },
    fighterApplication: {
      fullName: "João Santos",
      nickname: null,
      city: "São Paulo",
      stateCode: "SP",
      competitionHistory: "amador 0-3",
      editorialInterest: null,
    },
  },
  {
    id: "bia",
    cells: {
      fighter: "Bia Costa",
      location: "Curitiba, PR",
      cartel: "13-0",
    },
    fighterApplication: {
      fullName: "Bia Costa",
      nickname: null,
      city: "Curitiba",
      stateCode: "PR",
      competitionHistory: "13-0",
      editorialInterest: "bizarro",
    },
  },
];

describe("fighter application admin list helpers", () => {
  it("normalizes editorial interest raw values and labels", () => {
    assert.equal(normalizeFighterApplicationEditorialInterest(null), null);
    assert.equal(normalizeFighterApplicationEditorialInterest(""), null);
    assert.equal(normalizeFighterApplicationEditorialInterest("Interessante"), "interessante");
    assert.equal(
      normalizeFighterApplicationEditorialInterest("Não interessante"),
      "nao_interessante",
    );
    assert.equal(normalizeFighterApplicationEditorialInterest("fora-da-lista"), undefined);
  });

  it("extracts win-loss-draw records from free text", () => {
    assert.deepEqual(parseFighterRecordFromText("invicto, cartel 12-0"), {
      wins: 12,
      losses: 0,
      draws: 0,
      totalFights: 12,
    });
    assert.deepEqual(parseFighterRecordFromText("MMA amador: 5-2-1"), {
      wins: 5,
      losses: 2,
      draws: 1,
      totalFights: 8,
    });
    assert.equal(parseFighterRecordFromText("sem lutas informadas"), null);
  });

  it("filters rows by normalized name, city and state", () => {
    assert.deepEqual(
      filterFighterApplicationRows(rows, {
        name: "joao",
        city: "sao paulo",
        state: "SP",
        minRecord: "",
        maxRecord: "",
      }).map((row) => row.id),
      ["joao"],
    );
  });

  it("filters rows by cartel range using total fights from win-loss records", () => {
    assert.deepEqual(
      filterFighterApplicationRows(rows, {
        name: "",
        city: "",
        state: "",
        minRecord: "0-3",
        maxRecord: "12-0",
      }).map((row) => row.id),
      ["ana", "joao"],
    );
  });
});
