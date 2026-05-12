import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterFighterApplicationRows,
  normalizeFighterApplicationEditorialInterest,
  parseFighterRecordFromText,
  sortFighterApplicationRows,
  type FighterApplicationAdminListRow,
} from "../lib/admin/fighter-application-list";

const rows: FighterApplicationAdminListRow[] = [
  {
    id: "ana",
    cells: {
      fighter: "Ana Silva / Pitbull",
      weightClass: "Peso Palha",
      age: "24 anos",
      location: "Fortaleza, CE",
      editorialInterest: "Interessante",
      cartel: "Cartel 3-1",
    },
    fighterApplication: {
      fullName: "Ana Silva",
      nickname: "Pitbull",
      weightClass: "palha-feminino",
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
      weightClass: "Peso Leve",
      age: "31 anos",
      location: "São Paulo, SP",
      editorialInterest: "—",
      cartel: "amador 0-3",
    },
    fighterApplication: {
      fullName: "João Santos",
      nickname: null,
      weightClass: "leve",
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
      weightClass: "Peso Galo",
      age: "22 anos",
      location: "Curitiba, PR",
      editorialInterest: "Bizarro",
      cartel: "13-0",
    },
    fighterApplication: {
      fullName: "Bia Costa",
      nickname: null,
      weightClass: "galo",
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
        weightClass: "",
        editorialInterest: "",
        minAge: "",
        maxAge: "",
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
        weightClass: "",
        editorialInterest: "",
        minAge: "",
        maxAge: "",
        minRecord: "0-3",
        maxRecord: "12-0",
      }).map((row) => row.id),
      ["ana", "joao"],
    );
  });

  it("filters rows by category and MMMMA interest", () => {
    assert.deepEqual(
      filterFighterApplicationRows(rows, {
        name: "",
        city: "",
        state: "",
        weightClass: "galo",
        editorialInterest: "bizarro",
        minAge: "",
        maxAge: "",
        minRecord: "",
        maxRecord: "",
      }).map((row) => row.id),
      ["bia"],
    );
  });

  it("filters rows by minimum and maximum age", () => {
    assert.deepEqual(
      filterFighterApplicationRows(rows, {
        name: "",
        city: "",
        state: "",
        weightClass: "",
        editorialInterest: "",
        minAge: "23",
        maxAge: "30",
        minRecord: "",
        maxRecord: "",
      }).map((row) => row.id),
      ["ana"],
    );
  });

  it("sorts rows by column in ascending and descending order", () => {
    assert.deepEqual(
      sortFighterApplicationRows(rows, { key: "fighter", direction: "asc" }).map(
        (row) => row.id,
      ),
      ["ana", "bia", "joao"],
    );
    assert.deepEqual(
      sortFighterApplicationRows(rows, { key: "fighter", direction: "desc" }).map(
        (row) => row.id,
      ),
      ["joao", "bia", "ana"],
    );
  });

  it("sorts age and cartel as numbers instead of text", () => {
    assert.deepEqual(
      sortFighterApplicationRows(rows, { key: "age", direction: "asc" }).map((row) => row.id),
      ["bia", "ana", "joao"],
    );
    assert.deepEqual(
      sortFighterApplicationRows(rows, { key: "cartel", direction: "desc" }).map(
        (row) => row.id,
      ),
      ["bia", "ana", "joao"],
    );
  });
});
