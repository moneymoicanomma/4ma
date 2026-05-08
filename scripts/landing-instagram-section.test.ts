import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const landingPageSource = readFileSync(
  new URL("../app/page.tsx", import.meta.url),
  "utf8"
);
const envExampleSource = readFileSync(
  new URL("../.env.example", import.meta.url),
  "utf8"
);
const instagramProfileUrl = "https://www.instagram.com/moneymoicano.mma/";

describe("landing page Instagram section", () => {
  it("renders the Instagram feed between audience and newsletter content", () => {
    const audienceIndex = landingPageSource.indexOf("section--audience");
    const instagramIndex = landingPageSource.indexOf("<InstagramFeedSection");
    const newsletterIndex = landingPageSource.indexOf("section--cta");

    assert.ok(audienceIndex > -1, "Missing audience section");
    assert.ok(instagramIndex > audienceIndex, "Instagram section should follow audience");
    assert.ok(newsletterIndex > instagramIndex, "Newsletter section should follow Instagram");
    assert.ok(landingPageSource.includes("Se liga no Instagram"));
    assert.ok(landingPageSource.includes("fetchInstagramFeed"));
    assert.ok(landingPageSource.includes("instagram-feed__grid"));
    assert.ok(landingPageSource.includes(instagramProfileUrl));
  });

  it("documents the required Instagram API environment variables", () => {
    assert.ok(envExampleSource.includes("INSTAGRAM_USER_ID="));
    assert.ok(envExampleSource.includes("INSTAGRAM_ACCESS_TOKEN="));
    assert.ok(envExampleSource.includes("INSTAGRAM_POST_LIMIT=4"));
    assert.ok(envExampleSource.includes("INSTAGRAM_CACHE_SECONDS=3600"));
  });
});
