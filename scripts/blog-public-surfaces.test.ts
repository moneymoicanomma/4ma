import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveBlogCanonical, serializeJsonLdForScript } from "../lib/blog/metadata";
import { getBlogSafeHref } from "../lib/blog/rendering";

describe("blog public surfaces", () => {
  it("escapes JSON-LD before injecting into script tags", () => {
    const serialized = serializeJsonLdForScript({
      headline: "</script><script>alert(1)</script>"
    });

    assert.equal(serialized.includes("<"), false);
    assert.match(serialized, /\\u003c\/script>/);
  });

  it("normalizes canonical overrides to safe absolute or root-relative URLs", () => {
    assert.equal(resolveBlogCanonical("/blog/post", "/blog/fallback"), "/blog/post");
    assert.equal(resolveBlogCanonical("https://example.com/post", "/blog/fallback"), "https://example.com/post");
    assert.equal(resolveBlogCanonical("javascript:alert(1)", "/blog/fallback"), "/blog/fallback");
    assert.equal(resolveBlogCanonical("ftp://example.com/post", "/blog/fallback"), "/blog/fallback");
  });

  it("allows only safe public hrefs for rendered block links", () => {
    assert.equal(getBlogSafeHref("/blog/post"), "/blog/post");
    assert.equal(getBlogSafeHref("https://example.com/video"), "https://example.com/video");
    assert.equal(getBlogSafeHref("mailto:press@example.com"), "mailto:press@example.com");
    assert.equal(getBlogSafeHref("javascript:alert(1)"), null);
    assert.equal(getBlogSafeHref("data:text/html,hi"), null);
  });
});
