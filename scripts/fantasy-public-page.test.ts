import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const fantasyPageSource = readFileSync(
  new URL("../app/fantasy/page.tsx", import.meta.url),
  "utf8"
);
const fantasyExperienceSource = readFileSync(
  new URL("../app/components/fantasy-experience.tsx", import.meta.url),
  "utf8"
);
const fantasyExperienceCssSource = readFileSync(
  new URL("../app/components/fantasy-experience.module.css", import.meta.url),
  "utf8"
);
const normalizedFantasyPageSource = fantasyPageSource.replace(/\s+/g, " ");

function evaluateFighterInitials(name: string) {
  const match = fantasyExperienceSource.match(
    /function fighterInitials\(name: string\) \{([\s\S]*?)\n\}/
  );

  assert.ok(match?.[1], "Missing fighterInitials helper");

  return new Function("name", match[1])(name) as string;
}

describe("fantasy public page", () => {
  it("uses the public site header instead of exposing admin navigation", () => {
    assert.ok(fantasyPageSource.includes("LandingTopbar"));
    assert.equal(fantasyPageSource.includes('href="/admin/fantasy"'), false);
    assert.equal(fantasyPageSource.includes("Abrir admin"), false);
  });

  it("matches the landing hero image and public-facing copy", () => {
    assert.ok(fantasyPageSource.includes('siteAsset("hero-main-v5.webp")'));
    assert.ok(
      normalizedFantasyPageSource.includes(
        "Escolha o vencedor, método e round de cada luta. Acompanhe os resultados em tempo real. Finja entender de MMA."
      )
    );
    assert.equal(fantasyPageSource.includes("Quando o card fechar"), false);
  });

  it("keeps internal event stats out of the hero", () => {
    assert.equal(fantasyPageSource.includes("Card atual"), false);
    assert.equal(fantasyPageSource.includes("Lutas abertas"), false);
    assert.equal(fantasyPageSource.includes("Ranking publicado"), false);
    assert.equal(fantasyPageSource.includes("Resultados lançados"), false);
  });

  it("does not hide the picks interface behind a whole-shell reveal animation", () => {
    assert.equal(
      fantasyPageSource.includes('<div className={styles.interfaceShell} data-reveal>'),
      false
    );
  });

  it("ignores nickname quotes when rendering fallback fighter initials", () => {
    assert.equal(evaluateFighterInitials('ricardo "capoeira"'), "RC");
    assert.equal(evaluateFighterInitials('rodrigo "zé colmeia"'), "RZ");
  });

  it("uses blue selected styling for the blue corner fighter card", () => {
    assert.ok(fantasyExperienceSource.includes("fighterButtonSelectedBlue"));
    assert.ok(fantasyExperienceSource.includes("portraitSelectedBlue"));
    assert.ok(fantasyExperienceCssSource.includes(".fighterButtonSelectedBlue"));
    assert.ok(fantasyExperienceCssSource.includes(".portraitSelectedBlue"));
  });

  it("keeps the private picks and empty ranking copy simple", () => {
    assert.ok(fantasyExperienceSource.includes("Meus picks"));
    assert.ok(fantasyExperienceSource.includes("ainda sem resultados"));
    assert.equal(fantasyExperienceSource.includes("Consulta privada"), false);
    assert.equal(fantasyExperienceSource.includes("consulta privada"), false);
    assert.equal(fantasyExperienceSource.includes("cookie + link seguro"), false);
    assert.equal(fantasyExperienceSource.includes("Como o usuário vai rever"), false);
    assert.equal(fantasyExperienceSource.includes("Este bloco representa o ranking público"), false);
  });
});
