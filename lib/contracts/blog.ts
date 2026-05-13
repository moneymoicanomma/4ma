export const BLOG_DEFAULT_AUTHOR = "Equipe Money Moicano MMA";
export const BLOG_UPLOAD_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type BlogPostStatus = "draft" | "published";
export type BlogHeadingLevel = 2 | 3;

export type BlogContentBlock =
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "heading"; level: BlogHeadingLevel; text: string }
  | { id: string; type: "list"; style: "unordered" | "ordered"; items: string[] }
  | { id: string; type: "quote"; text: string; cite?: string }
  | { id: string; type: "image"; mediaId: string; url: string; altText: string; caption?: string }
  | { id: string; type: "embed"; provider: "youtube" | "instagram"; url: string; title?: string }
  | { id: string; type: "button"; label: string; url: string };

export type BlogTagSummary = {
  name: string;
  slug: string;
};

export type BlogMediaSummary = {
  id: string;
  publicUrl: string | null;
  altText: string | null;
  caption: string | null;
  contentType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
};

export type BlogSeoMetadata = {
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrlOverride: string | null;
  noindex: boolean;
  internalKeywords: string[];
  socialTitle: string | null;
  socialDescription: string | null;
  socialMediaId: string | null;
};

export type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: BlogPostStatus;
  isFeatured: boolean;
  authorName: string;
  coverUrl: string | null;
  coverAltText: string | null;
  tags: BlogTagSummary[];
  publishedAt: string | null;
  updatedAt: string;
  readingTimeMinutes: number;
};

export type BlogPostDetail = BlogPostSummary &
  BlogSeoMetadata & {
    coverMediaId: string | null;
    coverCaption: string | null;
    contentBlocks: BlogContentBlock[];
    markdown: string;
  };

export type BlogPostSavePayload = {
  title: string;
  slug: string;
  description: string;
  authorName: string;
  coverMediaId: string | null;
  coverAltText: string | null;
  coverCaption: string | null;
  isFeatured: boolean;
  contentBlocks: BlogContentBlock[];
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrlOverride: string | null;
  noindex: boolean;
  internalKeywords: string[];
  socialTitle: string | null;
  socialDescription: string | null;
  socialMediaId: string | null;
};

type BlogPostSaveParseResult =
  | {
      ok: true;
      data: BlogPostSavePayload;
    }
  | {
      ok: false;
      message: string;
    };

type BlogPostPublishValidationResult =
  | {
      ok: true;
      data: true;
    }
  | {
      ok: false;
      message: string;
    };

const BLOG_WORDS_PER_MINUTE = 220;
const MAX_TITLE_LENGTH = 140;
const MAX_AUTHOR_LENGTH = 120;
const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_TAG_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 260;
const MAX_ALT_TEXT_LENGTH = 240;
const MAX_CAPTION_LENGTH = 500;
const MAX_URL_LENGTH = 2048;
const MAX_BLOCKS = 120;
const MAX_LIST_ITEMS = 30;
const MAX_TAGS = 12;
const MAX_INTERNAL_KEYWORDS = 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeShortText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeLongText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\r\n/g, "\n") : "";
}

function normalizeOptionalShortText(input: unknown) {
  const value = normalizeShortText(input);
  return value || undefined;
}

function normalizeNullableId(input: unknown) {
  const value = normalizeShortText(input);
  return value || null;
}

function parseNullableUuid(input: unknown, label: string): { ok: true; value: string | null } | { ok: false; message: string } {
  const value = normalizeNullableId(input);

  if (!value || UUID_PATTERN.test(value)) {
    return {
      ok: true,
      value
    };
  }

  return {
    ok: false,
    message: `${label} de mídia inválido.`
  };
}

function normalizeNullableShortText(input: unknown, maxLength: number) {
  const value = truncateText(normalizeShortText(input), maxLength);
  return value || null;
}

function normalizeNullableLongText(input: unknown, maxLength: number) {
  const value = truncateText(normalizeLongText(input), maxLength);
  return value || null;
}

function normalizeBlockId(input: unknown, index: number) {
  const value = normalizeShortText(input);
  return value || `block-${index}`;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}

function stripAccents(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeSlugLike(input: unknown) {
  if (typeof input !== "string") {
    return "";
  }

  return stripAccents(input)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeStringList(
  input: unknown,
  normalize: (item: unknown) => string,
  keyForItem: (item: string) => string,
  limit: number
) {
  if (!Array.isArray(input)) {
    return [];
  }

  const values: string[] = [];
  const seen = new Set<string>();

  for (const item of input) {
    const value = normalize(item);
    const key = keyForItem(value);

    if (!value || !key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    values.push(value);

    if (values.length >= limit) {
      break;
    }
  }

  return values;
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength).trim() : value;
}

function validateRequiredText(
  value: string,
  options: {
    label: string;
    minLength?: number;
    maxLength: number;
  }
) {
  if (!value) {
    return `${options.label} é obrigatório.`;
  }

  if (value.length < (options.minLength ?? 1)) {
    return `${options.label} precisa ter mais detalhes.`;
  }

  if (value.length > options.maxLength) {
    return `${options.label} está grande demais.`;
  }

  return null;
}

function countWords(input: string) {
  const words = input.trim().match(/\S+/g);
  return words?.length ?? 0;
}

function blockTextParts(block: BlogContentBlock) {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return [block.text];
    case "list":
      return block.items;
    default:
      return [];
  }
}

export function normalizeBlogSlug(input: unknown): string {
  return normalizeSlugLike(input);
}

export function normalizeBlogTag(input: unknown): string {
  return normalizeSlugLike(input);
}

export function normalizeBlogTagName(input: unknown): string {
  const value = truncateText(normalizeShortText(input), MAX_TAG_NAME_LENGTH);
  return value.length >= 2 ? value : "";
}

export function normalizeBlogBlocks(input: unknown): BlogContentBlock[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const blocks: BlogContentBlock[] = [];

  for (let index = 0; index < input.length && blocks.length < MAX_BLOCKS; index += 1) {
    const rawBlock = input[index];

    if (!isRecord(rawBlock)) {
      continue;
    }

    const id = normalizeBlockId(rawBlock.id, index);

    switch (rawBlock.type) {
      case "paragraph": {
        const text = normalizeLongText(rawBlock.text);

        if (text) {
          blocks.push({ id, type: "paragraph", text });
        }

        break;
      }

      case "heading": {
        const text = normalizeShortText(rawBlock.text);
        const level: BlogHeadingLevel = rawBlock.level === 3 ? 3 : 2;

        if (text) {
          blocks.push({ id, type: "heading", level, text });
        }

        break;
      }

      case "list": {
        const style = rawBlock.style === "ordered" ? "ordered" : "unordered";
        const items = Array.isArray(rawBlock.items)
          ? rawBlock.items.map(normalizeShortText).filter(Boolean).slice(0, MAX_LIST_ITEMS)
          : [];

        if (items.length) {
          blocks.push({ id, type: "list", style, items });
        }

        break;
      }

      case "quote": {
        const text = normalizeLongText(rawBlock.text);
        const cite = normalizeOptionalShortText(rawBlock.cite);

        if (text) {
          blocks.push({ id, type: "quote", text, cite });
        }

        break;
      }

      case "image": {
        const mediaId = normalizeShortText(rawBlock.mediaId);
        const url = truncateText(normalizeShortText(rawBlock.url), MAX_URL_LENGTH);
        const altText = normalizeShortText(rawBlock.altText);
        const caption = normalizeOptionalShortText(rawBlock.caption);

        if (mediaId || url) {
          blocks.push({ id, type: "image", mediaId, url, altText, caption });
        }

        break;
      }

      case "embed": {
        const provider = rawBlock.provider === "instagram" ? "instagram" : "youtube";
        const url = truncateText(normalizeShortText(rawBlock.url), MAX_URL_LENGTH);
        const title = normalizeOptionalShortText(rawBlock.title);

        if (url) {
          blocks.push({ id, type: "embed", provider, url, title });
        }

        break;
      }

      case "button": {
        const label = normalizeShortText(rawBlock.label);
        const url = truncateText(normalizeShortText(rawBlock.url), MAX_URL_LENGTH);

        if (label && url) {
          blocks.push({ id, type: "button", label, url });
        }

        break;
      }
    }
  }

  return blocks;
}

export function calculateBlogReadingMetrics(blocks: readonly BlogContentBlock[]): {
  wordCount: number;
  readingTimeMinutes: number;
} {
  const wordCount = blocks.reduce(
    (total, block) => total + blockTextParts(block).reduce((sum, text) => sum + countWords(text), 0),
    0
  );

  return {
    wordCount,
    readingTimeMinutes: Math.max(1, Math.ceil(wordCount / BLOG_WORDS_PER_MINUTE))
  };
}

export function blocksToPlainText(blocks: readonly BlogContentBlock[]): string {
  return blocks
    .flatMap(blockTextParts)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildBlogExcerpt(input: string | readonly BlogContentBlock[], maxLength = 160) {
  const normalizedMaxLength = Number.isFinite(maxLength) && maxLength > 0 ? Math.floor(maxLength) : 160;
  const text =
    typeof input === "string"
      ? normalizeLongText(input).replace(/\s+/g, " ").trim()
      : blocksToPlainText(input);

  if (text.length <= normalizedMaxLength) {
    return text;
  }

  let excerpt = text.slice(0, normalizedMaxLength).trim();
  const nextCharacter = text.charAt(normalizedMaxLength);

  if (nextCharacter && !/\s/.test(nextCharacter)) {
    excerpt = excerpt.replace(/\s+\S*$/, "").trim() || excerpt;
  }

  return `${excerpt.replace(/[.,;:!?]+$/, "")}...`;
}

export function blockToMarkdown(block: BlogContentBlock): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "heading":
      return `${"#".repeat(block.level)} ${block.text}`;
    case "list":
      return block.items
        .map((item, index) => (block.style === "ordered" ? `${index + 1}. ${item}` : `- ${item}`))
        .join("\n");
    case "quote":
      return ["> " + block.text.replace(/\n/g, "\n> "), block.cite ? `> - ${block.cite}` : ""]
        .filter(Boolean)
        .join("\n");
    case "image":
      return [`![${block.altText}](${block.url})`, block.caption ? `_${block.caption}_` : ""]
        .filter(Boolean)
        .join("\n\n");
    case "embed":
      return block.title ? `[${block.title}](${block.url})` : block.url;
    case "button":
      return `[${block.label}](${block.url})`;
  }
}

export function blocksToMarkdown(blocks: readonly BlogContentBlock[]): string {
  return blocks.map(blockToMarkdown).filter(Boolean).join("\n\n");
}

export function parseBlogPostSavePayload(input: unknown): BlogPostSaveParseResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Corpo da requisição inválido."
    };
  }

  const title = truncateText(normalizeShortText(input.title), MAX_TITLE_LENGTH);
  const slug = normalizeBlogSlug(input.slug) || normalizeBlogSlug(title);
  const description = truncateText(normalizeLongText(input.description), MAX_DESCRIPTION_LENGTH);
  const authorName =
    truncateText(normalizeShortText(input.authorName), MAX_AUTHOR_LENGTH) || BLOG_DEFAULT_AUTHOR;
  const coverMediaId = parseNullableUuid(input.coverMediaId, "ID da capa");
  const socialMediaId = parseNullableUuid(input.socialMediaId, "ID social");
  const coverAltText = normalizeNullableShortText(input.coverAltText, MAX_ALT_TEXT_LENGTH);
  const tags = normalizeStringList(input.tags, normalizeBlogTagName, normalizeBlogTag, MAX_TAGS);
  const internalKeywords = normalizeStringList(
    input.internalKeywords,
    normalizeBlogTagName,
    (keyword) => keyword.toLowerCase(),
    MAX_INTERNAL_KEYWORDS
  );

  const titleError = validateRequiredText(title, {
    label: "Título",
    minLength: 3,
    maxLength: MAX_TITLE_LENGTH
  });

  if (titleError) {
    return {
      ok: false,
      message: titleError
    };
  }

  if (!slug) {
    return {
      ok: false,
      message: "Slug é obrigatório."
    };
  }

  if (!coverMediaId.ok) {
    return {
      ok: false,
      message: coverMediaId.message
    };
  }

  if (!socialMediaId.ok) {
    return {
      ok: false,
      message: socialMediaId.message
    };
  }

  if (coverAltText && coverAltText.length < 3) {
    return {
      ok: false,
      message: "Alt text da imagem de capa precisa ter mais detalhes."
    };
  }

  return {
    ok: true,
    data: {
      title,
      slug,
      description,
      authorName,
      coverMediaId: coverMediaId.value,
      coverAltText,
      coverCaption: normalizeNullableLongText(input.coverCaption, MAX_CAPTION_LENGTH),
      isFeatured: input.isFeatured === true,
      contentBlocks: normalizeBlogBlocks(input.contentBlocks),
      tags,
      seoTitle: normalizeNullableShortText(input.seoTitle, MAX_SHORT_TEXT_LENGTH),
      seoDescription: normalizeNullableLongText(input.seoDescription, MAX_DESCRIPTION_LENGTH),
      canonicalUrlOverride: normalizeNullableShortText(input.canonicalUrlOverride, MAX_URL_LENGTH),
      noindex: input.noindex === true,
      internalKeywords,
      socialTitle: normalizeNullableShortText(input.socialTitle, MAX_SHORT_TEXT_LENGTH),
      socialDescription: normalizeNullableLongText(input.socialDescription, MAX_DESCRIPTION_LENGTH),
      socialMediaId: socialMediaId.value
    }
  };
}

export function validateBlogPostForPublish(input: {
  title: string;
  slug: string;
  description: string;
  authorName: string;
  coverMediaId: string | null;
  coverAltText: string | null;
  contentBlocks: BlogContentBlock[];
  tags: string[];
  seoDescription?: string | null;
  socialDescription?: string | null;
}): BlogPostPublishValidationResult {
  const title = normalizeShortText(input.title);
  const slug = normalizeBlogSlug(input.slug);
  const description = normalizeLongText(input.description);
  const seoDescription = normalizeLongText(input.seoDescription);
  const socialDescription = normalizeLongText(input.socialDescription);
  const authorName = normalizeShortText(input.authorName);
  const coverAltText = normalizeShortText(input.coverAltText);
  const { wordCount } = calculateBlogReadingMetrics(input.contentBlocks);
  const tags = normalizeStringList(input.tags, normalizeBlogTagName, normalizeBlogTag, MAX_TAGS);
  const hasSearchSummary = [description, seoDescription, socialDescription].some(
    (summary) => summary.length >= 40
  );

  const textError =
    validateRequiredText(title, {
      label: "Título",
      minLength: 3,
      maxLength: MAX_TITLE_LENGTH
    }) ??
    validateRequiredText(authorName, {
      label: "Autor",
      minLength: 3,
      maxLength: MAX_AUTHOR_LENGTH
    });

  if (textError) {
    return {
      ok: false,
      message: textError
    };
  }

  if (!hasSearchSummary) {
    return {
      ok: false,
      message: "Preencha a descrição, SEO description ou descrição social com pelo menos 40 caracteres."
    };
  }

  if (!slug) {
    return {
      ok: false,
      message: "Slug é obrigatório."
    };
  }

  if (!input.coverMediaId) {
    return {
      ok: false,
      message: "Imagem de capa é obrigatória."
    };
  }

  const coverAltTextError = validateRequiredText(coverAltText, {
    label: "Alt text da imagem de capa",
    minLength: 3,
    maxLength: MAX_ALT_TEXT_LENGTH
  });

  if (coverAltTextError) {
    return {
      ok: false,
      message: coverAltTextError
    };
  }

  if (!input.contentBlocks.length || wordCount < 3) {
    return {
      ok: false,
      message: "Conteúdo do post precisa ter mais detalhes."
    };
  }

  if (!tags.length) {
    return {
      ok: false,
      message: "Adicione pelo menos uma tag."
    };
  }

  return {
    ok: true,
    data: true
  };
}
