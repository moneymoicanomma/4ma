import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  blockToMarkdown,
  blocksToPlainText,
  buildBlogExcerpt,
  calculateBlogReadingMetrics,
  normalizeBlogBlocks,
  normalizeBlogSlug,
  normalizeBlogTag,
  parseBlogPostSavePayload,
  validateBlogPostForPublish
} from "../lib/contracts/blog";

describe("blog contracts", () => {
  it("normalizes slugs and tags for public URLs", () => {
    assert.equal(normalizeBlogSlug("  Money Moicano: Luta BOA! "), "money-moicano-luta-boa");
    assert.equal(normalizeBlogTag("  Bastidores do MMA "), "bastidores-do-mma");
  });

  it("calculates reading metrics from textual blocks", () => {
    const metrics = calculateBlogReadingMetrics([
      { id: "1", type: "paragraph", text: "Uma duas tres quatro cinco." },
      { id: "2", type: "heading", level: 2, text: "Subtitulo forte" }
    ]);

    assert.equal(metrics.wordCount, 7);
    assert.equal(metrics.readingTimeMinutes, 1);
    assert.equal(calculateBlogReadingMetrics([]).readingTimeMinutes, 1);
  });

  it("derives plain text and excerpts from content blocks", () => {
    const blocks = [
      { id: "h", type: "heading" as const, level: 2 as const, text: "Analise do card" },
      {
        id: "p",
        type: "paragraph" as const,
        text: "Moicano domina a distancia e transforma a leitura de luta em vantagem clara."
      },
      { id: "img", type: "image" as const, mediaId: "m1", url: "/img.webp", altText: "Moicano no cage" }
    ];

    assert.equal(
      blocksToPlainText(blocks),
      "Analise do card Moicano domina a distancia e transforma a leitura de luta em vantagem clara."
    );
    assert.equal(buildBlogExcerpt(blocks, 42), "Analise do card Moicano domina a distancia...");
  });

  it("renders Markdown from supported blocks", () => {
    assert.equal(
      blockToMarkdown({ id: "h", type: "heading", level: 2, text: "Card principal" }),
      "## Card principal"
    );
    assert.equal(
      blockToMarkdown({ id: "q", type: "quote", text: "Luta de verdade." }),
      "> Luta de verdade."
    );
  });

  it("rejects publishing without cover alt text", () => {
    const validation = validateBlogPostForPublish({
      title: "Titulo valido",
      slug: "titulo-valido",
      description: "Descricao longa o suficiente para o card e para a meta description.",
      authorName: "Equipe Money Moicano MMA",
      coverMediaId: "00000000-0000-0000-0000-000000000000",
      coverAltText: "",
      contentBlocks: [{ id: "p", type: "paragraph", text: "Conteudo real do post." }],
      tags: ["MMA"]
    });

    assert.equal(validation.ok, false);
    assert.match(validation.message, /Alt text/);
  });

  it("rejects publishing with cover alt text shorter than the database constraint", () => {
    const validation = validateBlogPostForPublish({
      title: "Titulo valido",
      slug: "titulo-valido",
      description: "Descricao longa o suficiente para o card e para a meta description.",
      authorName: "Equipe Money Moicano MMA",
      coverMediaId: "00000000-0000-0000-0000-000000000000",
      coverAltText: "ab",
      contentBlocks: [{ id: "p", type: "paragraph", text: "Conteudo real do post." }],
      tags: ["MMA"]
    });

    assert.equal(validation.ok, false);
    assert.match(validation.message, /Alt text/);
  });

  it("normalizes missing block ids deterministically", () => {
    assert.deepEqual(normalizeBlogBlocks([{ type: "paragraph", text: "Sem id." }]), [
      { id: "block-0", type: "paragraph", text: "Sem id." }
    ]);
  });

  it("parses a save payload into stable normalized fields", () => {
    const longDescription = "a".repeat(300);
    const parsed = parseBlogPostSavePayload({
      title: "  Novo Post ",
      slug: "Novo Post",
      description: longDescription,
      authorName: "",
      coverAltText: "",
      seoDescription: longDescription,
      socialDescription: longDescription,
      tags: ["MMA", " mma ", "Bastidores"],
      contentBlocks: [{ id: "p1", type: "paragraph", text: "Primeiro paragrafo." }]
    });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.title, "Novo Post");
      assert.equal(parsed.data.slug, "novo-post");
      assert.deepEqual(parsed.data.tags, ["MMA", "Bastidores"]);
      assert.equal(parsed.data.authorName, "Equipe Money Moicano MMA");
      assert.equal(parsed.data.description.length, 260);
      const seoDescription = parsed.data.seoDescription;
      const socialDescription = parsed.data.socialDescription;
      if (seoDescription === null || socialDescription === null) {
        assert.fail("Expected SEO and social descriptions to be preserved.");
      }
      assert.equal(seoDescription.length, 260);
      assert.equal(socialDescription.length, 260);
      assert.equal(parsed.data.coverAltText, null);
    }
  });
});
