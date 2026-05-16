import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const landingPageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8"
);
const landingTopbarSource = readFileSync(
  new URL("../app/components/landing-topbar.tsx", import.meta.url),
  "utf8"
);

const expectedTicketsUrl =
  "https://www.sympla.com.br/evento/money-moicano-mma-1/3391967";

describe("landing page hero CTA", () => {
  it("links the primary hero button to Sympla tickets without changing the topbar blog link", () => {
    const heroActionsStart = landingPageSource.indexOf(
      `<div className="hero__actions">`
    );
    const heroActionsEnd = landingPageSource.indexOf(
      `<LandingButton href="#transmissao"`,
      heroActionsStart
    );
    const primaryHeroAction = landingPageSource.slice(heroActionsStart, heroActionsEnd);

    assert.ok(heroActionsStart > -1, "Missing hero actions");
    assert.ok(heroActionsEnd > heroActionsStart, "Missing secondary hero action");
    assert.ok(
      primaryHeroAction.includes("href={symplaTicketsUrl}"),
      "Primary hero CTA should use the Sympla URL constant"
    );
    assert.ok(
      primaryHeroAction.includes("target=\"_blank\""),
      "Primary hero CTA should open Sympla in a new tab"
    );
    assert.ok(primaryHeroAction.includes("Compre seu ingresso"));
    assert.ok(
      landingPageSource.includes(`const symplaTicketsUrl = "${expectedTicketsUrl}";`)
    );
    assert.ok(
      landingTopbarSource.includes(`{ href: "/blog", label: "Blog", sectionId: "blog" }`)
    );
  });
});
