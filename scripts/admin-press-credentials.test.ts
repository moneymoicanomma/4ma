import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCommaSeparatedEmailList } from "../lib/admin/email-copy";
import {
  getVisibleAdminDatabaseTableIds,
  type AdminBackofficeRole,
} from "../lib/admin/role-access";

describe("press credential admin helpers", () => {
  it("shows press credentials to the public relations role", () => {
    const role = "public_relations" satisfies AdminBackofficeRole;

    assert.ok(getVisibleAdminDatabaseTableIds(role).includes("press-credentials"));
  });

  it("builds a Gmail-ready comma-separated email list", () => {
    assert.equal(
      buildCommaSeparatedEmailList([
        "ana@redacao.com",
        " ",
        "BRUNO@CANAL.COM",
        "ana@redacao.com",
        "carla@site.com",
      ]),
      "ana@redacao.com, bruno@canal.com, carla@site.com",
    );
  });
});
