import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PRESS_CREDENTIAL_SOURCE,
  parsePressCredentialSubmission,
} from "../lib/contracts/press-credential";

const validPayload = {
  fullName: "  Ana   Souza  ",
  email: " ANA@REDAcao.COM ",
  mediaOutlet: "Portal Luta Hoje - https://lutahoje.example/pauta",
  documentNumber: "12.345.678-9",
  coverageType: "Texto e imagens para redes sociais",
  coverageNeeds: "Acesso para fotos no início do evento e orientação sobre área de imprensa.",
  website: "",
};

describe("press credential form contract", () => {
  it("normalizes a complete credential submission from the public form", () => {
    const parsed = parsePressCredentialSubmission(validPayload);

    assert.equal(parsed.ok, true);

    if (!parsed.ok) {
      return;
    }

    assert.equal(parsed.honeypotTriggered, false);
    assert.deepEqual(parsed.data, {
      fullName: "Ana Souza",
      email: "ana@redacao.com",
      mediaOutlet: "Portal Luta Hoje - https://lutahoje.example/pauta",
      documentNumber: "12.345.678-9",
      coverageType: "Texto e imagens para redes sociais",
      coverageNeeds: "Acesso para fotos no início do evento e orientação sobre área de imprensa.",
      source: PRESS_CREDENTIAL_SOURCE,
    });
  });

  it("requires every Google Form field used for credential review", () => {
    for (const fieldName of [
      "fullName",
      "email",
      "mediaOutlet",
      "documentNumber",
      "coverageType",
      "coverageNeeds",
    ] as const) {
      const parsed = parsePressCredentialSubmission({
        ...validPayload,
        [fieldName]: "",
      });

      assert.equal(parsed.ok, false, `${fieldName} should be required`);
    }
  });

  it("rejects invalid email addresses", () => {
    const parsed = parsePressCredentialSubmission({
      ...validPayload,
      email: "ana-sem-email",
    });

    assert.deepEqual(parsed, {
      ok: false,
      message: "Informe um e-mail válido.",
    });
  });

  it("accepts honeypot submissions without storing public data", () => {
    const parsed = parsePressCredentialSubmission({
      ...validPayload,
      website: "https://spam.example",
    });

    assert.equal(parsed.ok, true);

    if (!parsed.ok) {
      return;
    }

    assert.equal(parsed.honeypotTriggered, true);
    assert.equal(parsed.data.fullName, "");
    assert.equal(parsed.data.email, "");
  });
});
