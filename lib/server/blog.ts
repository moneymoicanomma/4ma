import "server-only";

import { randomUUID } from "node:crypto";

import type { QueryResult, QueryResultRow } from "pg";

import {
  BLOG_DEFAULT_AUTHOR,
  blocksToMarkdown,
  calculateBlogReadingMetrics,
  normalizeBlogBlocks,
  normalizeBlogSlug,
  normalizeBlogTag,
  normalizeBlogTagName,
  parseBlogPostSavePayload,
  validateBlogPostForPublish,
  type BlogPostDetail,
  type BlogPostStatus,
  type BlogPostSummary,
  type BlogTagSummary
} from "@/lib/contracts/blog";
import type { AdminSessionIdentity } from "@/lib/server/admin-session";
import {
  queryDatabase,
  withDatabaseTransaction,
  type DatabaseTransaction
} from "@/lib/server/database";
import { getServerEnv, isDatabaseConfigured } from "@/lib/server/env";
import { verifyBlogMediaUpload } from "@/lib/server/blog-media-storage";
import type { RequestAuditContext } from "@/lib/server/request-context";

type BlogQueryExecutor = {
  query<TResult extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<QueryResult<TResult>>;
};

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: BlogPostStatus;
  isFeatured: boolean;
  authorName: string;
  coverMediaId: string | null;
  coverUrl: string | null;
  coverAltText: string | null;
  coverCaption: string | null;
  contentBlocks: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrlOverride: string | null;
  noindex: boolean;
  internalKeywords: string[] | null;
  socialTitle: string | null;
  socialDescription: string | null;
  socialMediaId: string | null;
  publishedAt: Date | string | null;
  updatedAt: Date | string;
  readingTimeMinutes: number;
  tags: unknown;
};

type BlogTagCountRow = {
  name: string;
  slug: string;
  count: string | number;
};

type BlogSitemapRow = {
  href: string;
  updatedAt: Date | string;
};

type BlogMediaVerificationRow = {
  id: string;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
};

const publicQueryExecutor: BlogQueryExecutor = {
  query: queryDatabase
};

function isBlogDatabaseReadable() {
  return isDatabaseConfigured(getServerEnv());
}

function createEmptyPublicBlogIndex(): {
  featured: BlogPostSummary | null;
  posts: BlogPostSummary[];
  tags: Array<{ name: string; slug: string; count: number }>;
} {
  return {
    featured: null,
    posts: [],
    tags: []
  };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function buildDatabaseRequestContext(
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
) {
  return {
    actorId: identity.kind === "account" ? identity.accountId : null,
    actorRole: identity.role,
    actorEmail: identity.username,
    requestId: requestContext.requestId,
    clientIp: requestContext.clientIp,
    origin: requestContext.requestOrigin,
    userAgent: requestContext.userAgent
  };
}

function toIsoString(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function normalizeTags(input: unknown): BlogTagSummary[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((tag) => {
      if (!tag || typeof tag !== "object") {
        return null;
      }

      const record = tag as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "";
      const slug = typeof record.slug === "string" ? record.slug : "";

      return name && slug ? { name, slug } : null;
    })
    .filter((tag): tag is BlogTagSummary => tag !== null);
}

function normalizeInternalKeywords(input: string[] | null) {
  return Array.isArray(input) ? input.filter((keyword) => typeof keyword === "string") : [];
}

function mapBlogPostSummary(row: BlogPostRow): BlogPostSummary {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    isFeatured: row.isFeatured,
    authorName: row.authorName,
    coverUrl: row.coverUrl,
    coverAltText: row.coverAltText,
    tags: normalizeTags(row.tags),
    publishedAt: toIsoString(row.publishedAt),
    updatedAt: toIsoString(row.updatedAt)!,
    readingTimeMinutes: Math.max(1, Number(row.readingTimeMinutes) || 1)
  };
}

function mapBlogPostDetail(row: BlogPostRow): BlogPostDetail {
  const contentBlocks = normalizeBlogBlocks(row.contentBlocks);

  return {
    ...mapBlogPostSummary(row),
    coverMediaId: row.coverMediaId,
    coverCaption: row.coverCaption,
    contentBlocks,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalUrlOverride: row.canonicalUrlOverride,
    noindex: row.noindex,
    internalKeywords: normalizeInternalKeywords(row.internalKeywords),
    socialTitle: row.socialTitle,
    socialDescription: row.socialDescription,
    socialMediaId: row.socialMediaId,
    markdown: blocksToMarkdown(contentBlocks)
  };
}

function mapTagCount(row: BlogTagCountRow) {
  return {
    name: row.name,
    slug: row.slug,
    count: Number(row.count) || 0
  };
}

function getBlogPostSelect(whereClause: string) {
  return `
    select
      p.id::text as id,
      p.title,
      p.slug,
      p.description,
      p.status::text as status,
      p.is_featured as "isFeatured",
      p.author_name as "authorName",
      p.cover_media_id::text as "coverMediaId",
      m.public_url as "coverUrl",
      p.cover_alt_text as "coverAltText",
      p.cover_caption as "coverCaption",
      p.content_blocks as "contentBlocks",
      p.seo_title as "seoTitle",
      p.seo_description as "seoDescription",
      p.canonical_url_override as "canonicalUrlOverride",
      p.noindex,
      p.internal_keywords as "internalKeywords",
      p.social_title as "socialTitle",
      p.social_description as "socialDescription",
      p.social_media_id::text as "socialMediaId",
      p.published_at as "publishedAt",
      p.updated_at as "updatedAt",
      p.reading_time_minutes as "readingTimeMinutes",
      coalesce(
        jsonb_agg(jsonb_build_object('name', t.name, 'slug', t.slug) order by t.name)
          filter (where t.id is not null),
        '[]'::jsonb
      ) as tags
    from app.blog_posts p
    left join app.blog_media m on m.id = p.cover_media_id
    left join app.blog_post_tags pt on pt.post_id = p.id
    left join app.blog_tags t on t.id = pt.tag_id
    ${whereClause}
    group by p.id, m.public_url
  `;
}

async function queryBlogPostById(
  executor: BlogQueryExecutor,
  postId: string,
  options: { publicOnly?: boolean } = {}
) {
  if (!isUuid(postId)) {
    return null;
  }

  const result = await executor.query<BlogPostRow>(
    `
      ${getBlogPostSelect(
        options.publicOnly
          ? "where p.id = $1::uuid and p.status = 'published'"
          : "where p.id = $1::uuid"
      )}
      limit 1
    `,
    [postId]
  );

  return result.rows[0] ? mapBlogPostDetail(result.rows[0]) : null;
}

async function queryBlogPostBySlug(executor: BlogQueryExecutor, slug: string) {
  const result = await executor.query<BlogPostRow>(
    `
      ${getBlogPostSelect("where p.slug = $1 and p.status = 'published'")}
      limit 1
    `,
    [slug]
  );

  return result.rows[0] ? mapBlogPostDetail(result.rows[0]) : null;
}

async function replacePostTags(
  transaction: DatabaseTransaction,
  postId: string,
  tags: readonly string[]
) {
  await transaction.query("delete from app.blog_post_tags where post_id = $1::uuid", [postId]);

  for (const tagName of tags) {
    const name = normalizeBlogTagName(tagName);
    const slug = normalizeBlogTag(name);

    if (!name || !slug) {
      continue;
    }

    const tagResult = await transaction.query<{ id: string }>(
      `
        insert into app.blog_tags (name, slug)
        values ($1, $2)
        on conflict (slug) do update
        set name = excluded.name
        returning id::text as id
      `,
      [name, slug]
    );
    const tagId = tagResult.rows[0]?.id;

    if (!tagId) {
      continue;
    }

    await transaction.query(
      `
        insert into app.blog_post_tags (post_id, tag_id)
        values ($1::uuid, $2::uuid)
        on conflict do nothing
      `,
      [postId, tagId]
    );
  }
}

async function ensureUniqueSlug(
  transaction: DatabaseTransaction,
  postId: string,
  slug: string
) {
  const result = await transaction.query<{ id: string }>(
    `
      select id::text as id
      from app.blog_posts
      where slug = $1
        and id <> $2::uuid
      limit 1
    `,
    [slug, postId]
  );

  return result.rowCount === 0;
}

async function clearOtherFeaturedPosts(transaction: DatabaseTransaction, postId: string) {
  await transaction.query(
    `
      update app.blog_posts
      set is_featured = false
      where id <> $1::uuid
        and status = 'published'
        and is_featured = true
    `,
    [postId]
  );
}

function collectPostMediaIds(post: BlogPostDetail) {
  const ids = new Set<string>();
  const invalidIds: string[] = [];

  for (const candidate of [
    post.coverMediaId,
    post.socialMediaId,
    ...post.contentBlocks
      .filter((block) => block.type === "image")
      .map((block) => block.mediaId)
  ]) {
    if (!candidate) {
      continue;
    }

    if (!isUuid(candidate)) {
      invalidIds.push(candidate);
      continue;
    }

    ids.add(candidate);
  }

  return {
    ids: Array.from(ids),
    invalidIds
  };
}

async function validatePostMediaUploads(transaction: DatabaseTransaction, post: BlogPostDetail) {
  const mediaIds = collectPostMediaIds(post);

  if (mediaIds.invalidIds.length) {
    return {
      ok: false as const,
      message: "Uma imagem do post tem ID de mídia inválido."
    };
  }

  if (!mediaIds.ids.length) {
    return {
      ok: true as const
    };
  }

  const mediaResult = await transaction.query<BlogMediaVerificationRow>(
    `
      select
        id::text as id,
        storage_provider as "storageProvider",
        storage_bucket as bucket,
        object_key as "objectKey",
        content_type as "contentType",
        byte_size as "byteSize"
      from app.blog_media
      where id = any($1::uuid[])
    `,
    [mediaIds.ids]
  );
  const mediaById = new Map(mediaResult.rows.map((row) => [row.id, row]));

  if (mediaById.size !== mediaIds.ids.length) {
    return {
      ok: false as const,
      message: "Uma imagem do post não foi encontrada no banco."
    };
  }

  for (const mediaId of mediaIds.ids) {
    const media = mediaById.get(mediaId);

    if (!media) {
      return {
        ok: false as const,
        message: "Uma imagem do post não foi encontrada no banco."
      };
    }

    const isUploaded = await verifyBlogMediaUpload(media).catch(() => false);

    if (!isUploaded) {
      return {
        ok: false as const,
        message: "Envie novamente as imagens do post antes de publicar."
      };
    }
  }

  return {
    ok: true as const
  };
}

export async function listAdminBlogPosts(): Promise<BlogPostSummary[]> {
  const result = await queryDatabase<BlogPostRow>(
    `
      ${getBlogPostSelect("")}
      order by p.updated_at desc, p.created_at desc
    `
  );

  return result.rows.map(mapBlogPostSummary);
}

export async function createBlogDraft(
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<string> {
  const draftId = randomUUID();
  const draftSlug = `rascunho-${draftId.slice(0, 8)}`;

  await withDatabaseTransaction(
    buildDatabaseRequestContext(identity, requestContext),
    async (transaction) => {
      await transaction.query(
        `
          insert into app.blog_posts (
            id,
            title,
            slug,
            description,
            author_name,
            status,
            content_blocks,
            word_count,
            reading_time_minutes,
            created_by_account_id,
            updated_by_account_id
          )
          values (
            $1::uuid,
            $2,
            $3,
            $4,
            $5,
            'draft',
            '[]'::jsonb,
            0,
            1,
            $6::uuid,
            $6::uuid
          )
        `,
        [
          draftId,
          "Novo post",
          draftSlug,
          "Rascunho criado pela redacao.",
          BLOG_DEFAULT_AUTHOR,
          identity.kind === "account" ? identity.accountId : null
        ]
      );
    }
  );

  return draftId;
}

export async function getAdminBlogPost(postId: string): Promise<BlogPostDetail | null> {
  return queryBlogPostById(publicQueryExecutor, postId);
}

export async function saveAdminBlogPost(
  postId: string,
  input: unknown,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<{ ok: true; post: BlogPostDetail } | { ok: false; message: string }> {
  if (!isUuid(postId)) {
    return {
      ok: false,
      message: "ID de post inválido."
    };
  }

  const parsed = parseBlogPostSavePayload(input);

  if (!parsed.ok) {
    return parsed;
  }

  const payload = parsed.data;
  const contentBlocks = normalizeBlogBlocks(payload.contentBlocks);
  const metrics = calculateBlogReadingMetrics(contentBlocks);

  return withDatabaseTransaction(
    buildDatabaseRequestContext(identity, requestContext),
    async (transaction) => {
      const existingResult = await transaction.query<{
        slug: string;
        status: BlogPostStatus;
      }>(
        `
          select slug, status::text as status
          from app.blog_posts
          where id = $1::uuid
          limit 1
        `,
        [postId]
      );
      const existing = existingResult.rows[0];

      if (!existing) {
        return {
          ok: false,
          message: "Post nao encontrado."
        };
      }

      const slugIsUnique = await ensureUniqueSlug(transaction, postId, payload.slug);

      if (!slugIsUnique) {
        return {
          ok: false,
          message: "Ja existe um post com esse slug."
        };
      }

      if (existing.status === "published" && existing.slug !== payload.slug) {
        await transaction.query(
          `
            insert into app.blog_slug_redirects (old_slug, post_id)
            values ($1, $2::uuid)
            on conflict (old_slug) do update
            set
              post_id = excluded.post_id,
              created_at = now()
          `,
          [existing.slug, postId]
        );
      }

      if (payload.isFeatured && existing.status === "published") {
        await clearOtherFeaturedPosts(transaction, postId);
      }

      await transaction.query(
        `
          update app.blog_posts
          set
            title = $2,
            slug = $3,
            description = $4,
            cover_media_id = $5::uuid,
            cover_alt_text = $6,
            cover_caption = $7,
            author_name = $8,
            is_featured = $9,
            content_blocks = $10::jsonb,
            seo_title = $11,
            seo_description = $12,
            canonical_url_override = $13,
            noindex = $14,
            internal_keywords = $15::text[],
            social_title = $16,
            social_description = $17,
            social_media_id = $18::uuid,
            word_count = $19,
            reading_time_minutes = $20,
            updated_by_account_id = $21::uuid
          where id = $1::uuid
        `,
        [
          postId,
          payload.title,
          payload.slug,
          payload.description,
          payload.coverMediaId,
          payload.coverAltText,
          payload.coverCaption,
          payload.authorName,
          payload.isFeatured,
          JSON.stringify(contentBlocks),
          payload.seoTitle,
          payload.seoDescription,
          payload.canonicalUrlOverride,
          payload.noindex,
          payload.internalKeywords,
          payload.socialTitle,
          payload.socialDescription,
          payload.socialMediaId,
          metrics.wordCount,
          metrics.readingTimeMinutes,
          identity.kind === "account" ? identity.accountId : null
        ]
      );

      await replacePostTags(transaction, postId, payload.tags);

      const post = await queryBlogPostById(transaction, postId);

      return post
        ? { ok: true, post }
        : {
            ok: false,
            message: "Post nao encontrado."
          };
    }
  );
}

export async function publishAdminBlogPost(
  postId: string,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<{ ok: true; post: BlogPostDetail } | { ok: false; message: string }> {
  if (!isUuid(postId)) {
    return {
      ok: false,
      message: "ID de post inválido."
    };
  }

  return withDatabaseTransaction(
    buildDatabaseRequestContext(identity, requestContext),
    async (transaction) => {
      const post = await queryBlogPostById(transaction, postId);

      if (!post) {
        return {
          ok: false,
          message: "Post nao encontrado."
        };
      }

      const validation = validateBlogPostForPublish({
        title: post.title,
        slug: post.slug,
        description: post.description,
        authorName: post.authorName,
        coverMediaId: post.coverMediaId,
        coverAltText: post.coverAltText,
        contentBlocks: post.contentBlocks,
        tags: post.tags.map((tag) => tag.name)
      });

      if (!validation.ok) {
        return validation;
      }

      const mediaValidation = await validatePostMediaUploads(transaction, post);

      if (!mediaValidation.ok) {
        return mediaValidation;
      }

      if (post.isFeatured) {
        await clearOtherFeaturedPosts(transaction, postId);
      }

      await transaction.query(
        `
          update app.blog_posts
          set
            status = 'published',
            published_at = coalesce(published_at, now()),
            updated_by_account_id = $2::uuid
          where id = $1::uuid
        `,
        [postId, identity.kind === "account" ? identity.accountId : null]
      );

      const publishedPost = await queryBlogPostById(transaction, postId);

      return publishedPost
        ? { ok: true, post: publishedPost }
        : {
            ok: false,
            message: "Post nao encontrado."
          };
    }
  );
}

export async function unpublishAdminBlogPost(
  postId: string,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<{ ok: true; post: BlogPostDetail } | { ok: false; message: string }> {
  if (!isUuid(postId)) {
    return {
      ok: false,
      message: "ID de post inválido."
    };
  }

  return withDatabaseTransaction(
    buildDatabaseRequestContext(identity, requestContext),
    async (transaction) => {
      await transaction.query(
        `
          update app.blog_posts
          set
            status = 'draft',
            is_featured = false,
            published_at = null,
            updated_by_account_id = $2::uuid
          where id = $1::uuid
        `,
        [postId, identity.kind === "account" ? identity.accountId : null]
      );

      const post = await queryBlogPostById(transaction, postId);

      return post
        ? { ok: true, post }
        : {
            ok: false,
            message: "Post nao encontrado."
          };
    }
  );
}

export async function listPublicBlogPosts(): Promise<{
  featured: BlogPostSummary | null;
  posts: BlogPostSummary[];
  tags: Array<{ name: string; slug: string; count: number }>;
}> {
  if (!isBlogDatabaseReadable()) {
    return createEmptyPublicBlogIndex();
  }

  const [postsResult, tagsResult] = await Promise.all([
    queryDatabase<BlogPostRow>(
      `
        ${getBlogPostSelect("where p.status = 'published'")}
        order by p.published_at desc nulls last, p.updated_at desc
      `
    ),
    queryDatabase<BlogTagCountRow>(
      `
        select
          t.name,
          t.slug,
          count(distinct p.id) as count
        from app.blog_tags t
        join app.blog_post_tags pt on pt.tag_id = t.id
        join app.blog_posts p on p.id = pt.post_id
        where p.status = 'published'
        group by t.id
        order by count desc, t.name asc
      `
    )
  ]);
  const summaries = postsResult.rows.map(mapBlogPostSummary);
  const featured = summaries.find((post) => post.isFeatured) ?? null;

  return {
    featured,
    posts: featured ? summaries.filter((post) => post.id !== featured.id) : summaries,
    tags: tagsResult.rows.map(mapTagCount)
  };
}

export async function getPublicBlogPostBySlug(slug: string): Promise<BlogPostDetail | null> {
  const normalizedSlug = normalizeBlogSlug(slug);

  return normalizedSlug && isBlogDatabaseReadable()
    ? queryBlogPostBySlug(publicQueryExecutor, normalizedSlug)
    : null;
}

export async function getBlogRedirectForSlug(slug: string): Promise<string | null> {
  const normalizedSlug = normalizeBlogSlug(slug);

  if (!normalizedSlug) {
    return null;
  }

  if (!isBlogDatabaseReadable()) {
    return null;
  }

  const result = await queryDatabase<{ slug: string }>(
    `
      select p.slug
      from app.blog_slug_redirects r
      join app.blog_posts p on p.id = r.post_id
      where r.old_slug = $1
        and p.status = 'published'
      limit 1
    `,
    [normalizedSlug]
  );

  return result.rows[0]?.slug ?? null;
}

export async function listPublicBlogPostsByTag(
  tagSlug: string
): Promise<{ tag: { name: string; slug: string }; posts: BlogPostSummary[] } | null> {
  const normalizedSlug = normalizeBlogSlug(tagSlug);

  if (!normalizedSlug) {
    return null;
  }

  if (!isBlogDatabaseReadable()) {
    return null;
  }

  const tagResult = await queryDatabase<{ name: string; slug: string }>(
    `
      select distinct
        t.name,
        t.slug
      from app.blog_tags t
      join app.blog_post_tags pt on pt.tag_id = t.id
      join app.blog_posts p on p.id = pt.post_id
      where t.slug = $1
        and p.status = 'published'
      limit 1
    `,
    [normalizedSlug]
  );
  const tag = tagResult.rows[0];

  if (!tag) {
    return null;
  }

  const postsResult = await queryDatabase<BlogPostRow>(
    `
      ${getBlogPostSelect(
        `
          join app.blog_post_tags selected_pt
            on selected_pt.post_id = p.id
          join app.blog_tags selected_t
            on selected_t.id = selected_pt.tag_id
          where p.status = 'published'
            and selected_t.slug = $1
        `
      )}
      order by p.published_at desc nulls last, p.updated_at desc
    `,
    [normalizedSlug]
  );

  return {
    tag,
    posts: postsResult.rows.map(mapBlogPostSummary)
  };
}

export async function listBlogTagSuggestions(): Promise<
  Array<{ name: string; slug: string; count: number }>
> {
  const result = await queryDatabase<BlogTagCountRow>(
    `
      select
        t.name,
        t.slug,
        count(distinct pt.post_id) as count
      from app.blog_tags t
      left join app.blog_post_tags pt on pt.tag_id = t.id
      group by t.id
      order by count desc, t.name asc
    `
  );

  return result.rows.map(mapTagCount);
}

export async function listBlogSitemapEntries(): Promise<Array<{ href: string; updatedAt: Date }>> {
  if (!isBlogDatabaseReadable()) {
    return [];
  }

  const result = await queryDatabase<BlogSitemapRow>(
    `
      select '/blog' as href, coalesce(max(updated_at), now()) as "updatedAt"
      from app.blog_posts
      where status = 'published'
        and noindex = false
      union all
      select '/blog/' || slug as href, updated_at as "updatedAt"
      from app.blog_posts
      where status = 'published'
        and noindex = false
      union all
      select '/blog/tags/' || t.slug as href, max(p.updated_at) as "updatedAt"
      from app.blog_tags t
      join app.blog_post_tags pt on pt.tag_id = t.id
      join app.blog_posts p on p.id = pt.post_id
      where p.status = 'published'
        and p.noindex = false
      group by t.id
      order by href asc
    `
  );

  return result.rows.map((row) => ({
    href: row.href,
    updatedAt: toDate(row.updatedAt)
  }));
}

export async function getBlogLlmsIndex(): Promise<string> {
  if (!isBlogDatabaseReadable()) {
    return [
      "# Money Moicano MMA Blog",
      "",
      "Indice textual dos posts publicados do Money Moicano MMA.",
      "",
      "Nenhum post publicado no momento.",
      ""
    ].join("\n");
  }

  const result = await queryDatabase<{
    title: string;
    slug: string;
    description: string;
    updatedAt: Date | string;
  }>(
    `
      select
        title,
        slug,
        description,
        updated_at as "updatedAt"
      from app.blog_posts
      where status = 'published'
        and noindex = false
      order by published_at desc nulls last, updated_at desc
    `
  );

  const lines = [
    "# Money Moicano MMA Blog",
    "",
    "Indice textual dos posts publicados do Money Moicano MMA.",
    "",
    ...result.rows.map(
      (post) => `- [${post.title}](/blog/${post.slug}.md) - ${post.description}`
    )
  ];

  return `${lines.join("\n")}\n`;
}

export async function createBlogMediaRecord(
  input: {
    storageProvider: string;
    bucket: string;
    objectKey: string;
    publicUrl: string | null;
    fileName: string;
    contentType: string;
    byteSize: number;
  },
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
) {
  return withDatabaseTransaction(
    buildDatabaseRequestContext(identity, requestContext),
    async (transaction) => {
      const result = await transaction.query<{ id: string }>(
        `
          insert into app.blog_media (
            storage_provider,
            storage_bucket,
            object_key,
            public_url,
            original_file_name,
            content_type,
            byte_size,
            created_by_account_id
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8::uuid)
          returning id::text as id
        `,
        [
          input.storageProvider,
          input.bucket,
          input.objectKey,
          input.publicUrl,
          input.fileName,
          input.contentType,
          input.byteSize,
          identity.kind === "account" ? identity.accountId : null
        ]
      );

      return result.rows[0]!.id;
    }
  );
}
