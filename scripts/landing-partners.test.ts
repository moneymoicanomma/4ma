import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const landingPageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8"
);
const siteAssetsSource = readFileSync(
  new URL("../lib/site-assets.ts", import.meta.url),
  "utf8"
);
const globalsCssSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8"
);

const expectedPartners = [
  {
    name: "Timeout Brazil",
    logo: "Timeout.svg",
    href: "https://timeoutbrazil.com.br"
  },
  {
    name: "Fighter Stat",
    logo: "fighter_stat.svg",
    href: "https://fighterstat.com/"
  },
  {
    name: "KR3W",
    logo: "krew.svg",
    href: "http://kr3w.gg/"
  },
  {
    name: "Mdue",
    logo: "mdue.svg",
    href:
      "https://hub.la/g/3KzbFzhm4Lb56jJcDqut?utm_id=97760_v0_s00_e0_tv3"
  }
];

describe("landing page partner sponsors", () => {
  for (const partner of expectedPartners) {
    it(`includes ${partner.name} with its Cloudflare logo and destination`, () => {
      assert.ok(
        landingPageSource.includes(`name: "${partner.name}"`),
        `Missing partner name: ${partner.name}`
      );
      assert.ok(
        landingPageSource.includes(`siteAsset("${partner.logo}")`),
        `Missing partner logo: ${partner.logo}`
      );
      assert.ok(
        landingPageSource.includes(partner.href),
        `Missing partner destination: ${partner.href}`
      );
      assert.match(
        siteAssetsSource,
        new RegExp(`"${partner.logo}":\\s+\\{ width: [0-9.]+, height: [0-9.]+ \\}`)
      );
    });
  }

  it("centers the sponsor logo wall as four logos over three on desktop", () => {
    assert.ok(
      globalsCssSource.includes("grid-template-columns: repeat(8, minmax(0, 1fr))")
    );
    assert.ok(globalsCssSource.includes(".partner-logo:nth-child(5)"));
    assert.ok(globalsCssSource.includes("grid-column: 2 / span 2"));
  });
});
