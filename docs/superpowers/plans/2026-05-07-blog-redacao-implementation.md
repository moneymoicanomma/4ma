# Blog Redacao Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-class blog and editorial CMS inside the existing Money Moicano MMA Next.js app.

**Architecture:** Add an `editor` backoffice role, store blog posts/tags/media in Postgres, upload images through the existing S3/R2-compatible storage, render public blog pages from published rows only, and generate SEO/LLM surfaces from the same structured block model. Mutations stay behind admin API routes with explicit session and role checks.

**Tech Stack:** Next.js App Router 16, React 19, TypeScript 6, Postgres/RDS through `pg`, S3/R2 through AWS SDK, CSS Modules, Node test runner with `tsx` for focused helper tests.

---

## Scope Check

This is one end-to-end feature with several layers, but the layers are tightly coupled: the admin editor needs the contracts, server repository, storage route, database schema, and public renderers. The plan splits implementation into shippable tasks with commits after each task so a worker can pause safely.

## File Structure

Create or modify these files:

- `package.json`, `package-lock.json`: add `tsx` and focused blog test scripts.
- `.env.example`: document editor credentials and public blog media URL assumptions.
- `db/migrations/0012_blog_editorial_cms.sql`: add `editor` role, blog status enum, blog tables, RLS, indexes, grants, and slug redirect support.
- `lib/admin/auth.ts`: accept `editor` fallback credentials and signed fallback sessions.
- `lib/server/auth-store.ts`: accept database accounts with `editor` role.
- `lib/server/admin-access.ts`: add blog access helpers and deny Fantasy/Banco for `editor`.
- `lib/server/admin-session.ts`: allow `editor` backoffice sessions.
- `app/api/admin/session/route.ts`: allow `editor` database login and redirect to `/admin/blog`.
- `app/components/admin-topbar.tsx`: add Blog nav item and role-aware public actions.
- `lib/contracts/blog.ts`: define blog block model, slug/tag normalization, upload request parsing, save payload parsing, publish validation, Markdown rendering, plain text extraction, and reading-time helpers.
- `scripts/blog-contracts.test.ts`: runtime tests for the blog contract helpers.
- `lib/server/blog-media-storage.ts`: create signed upload targets for blog media using the same S3/R2 env.
- `lib/server/blog.ts`: repository functions for admin and public reads/writes.
- `app/api/admin/blog/posts/route.ts`: list and create posts.
- `app/api/admin/blog/posts/[postId]/route.ts`: read, save, publish, despublish, and highlight posts.
- `app/api/admin/blog/uploads/route.ts`: create signed upload targets for cover/body images.
- `app/api/admin/blog/tags/route.ts`: return tag suggestions.
- `app/admin/blog/page.tsx`, `app/admin/blog/page.module.css`: admin list.
- `app/admin/blog/novo/page.tsx`: create draft and redirect.
- `app/admin/blog/[postId]/page.tsx`, `app/admin/blog/[postId]/page.module.css`: editor page shell.
- `app/components/blog-admin-dashboard.tsx`, `app/components/blog-admin-dashboard.module.css`: admin list client component.
- `app/components/blog-post-editor.tsx`, `app/components/blog-post-editor.module.css`: block editor client component.
- `app/blog/page.tsx`, `app/blog/page.module.css`: public blog listing.
- `app/blog/tags/[tagSlug]/page.tsx`: public tag page.
- `app/blog/[slug]/page.tsx`, `app/blog/[slug]/page.module.css`: public post page.
- `app/blog/[slug].md/route.ts`: Markdown version of published posts.
- `app/llms.txt/route.ts`: LLM index.
- `lib/blog/rendering.tsx`: server-side HTML rendering helpers for blocks and structured data inputs.
- `lib/blog/metadata.ts`: shared metadata and JSON-LD builders.
- `app/sitemap.ts`: include blog listing, posts, and tags.
- `app/robots.ts`: update private blocks and AI crawler policy.
- `next.config.ts`: allow blog media public host if configured.

## Data Contracts

Use these shared names throughout the implementation:

```ts
export type BlogPostStatus = "draft" | "published";
export type BlogBlockType =
  | "paragraph"
  | "heading"
  | "list"
  | "quote"
  | "image"
  | "embed"
  | "button";
```

Published public routes must only return rows where `status = 'published'`. Admin routes can see drafts and published posts.

---

## Task 1: Add Test Harness and Editor Role Access

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Modify: `lib/admin/auth.ts`
- Modify: `lib/server/auth-store.ts`
- Modify: `lib/server/admin-access.ts`
- Modify: `lib/server/admin-session.ts`
- Modify: `app/api/admin/session/route.ts`
- Modify: `app/components/admin-topbar.tsx`
- Test: `npm run typecheck`

- [ ] **Step 1: Add `tsx` and blog test script**

Run:

```bash
npm install --save-dev tsx
npm pkg set scripts.test:blog="node --import tsx --test scripts/blog-*.test.ts"
```

Expected: `package.json` and `package-lock.json` update, and `npm run test:blog` exists.

- [ ] **Step 2: Extend fallback admin roles**

In `lib/admin/auth.ts`, change the role union:

```ts
export type AdminAuthRole = "admin" | "operator" | "auditor" | "editor";
```

Update `normalizeAdminRole`:

```ts
function normalizeAdminRole(value: unknown): AdminAuthRole {
  if (typeof value !== "string") {
    return "admin";
  }

  const normalizedValue = value.trim().toLowerCase();

  if (
    normalizedValue === "auditor" ||
    normalizedValue === "operator" ||
    normalizedValue === "editor"
  ) {
    return normalizedValue;
  }

  return "admin";
}
```

Add the dedicated env credential in `getAdminAuthConfig()` after auditor:

```ts
appendAdminCredential(credentials, seenNormalizedIdentifiers, {
  username: normalizeEnvValue(process.env.ADMIN_EDITOR_USERNAME),
  password: normalizeEnvValue(process.env.ADMIN_EDITOR_PASSWORD),
  role: "editor",
});
```

Update `verifyAdminSessionToken` role validation:

```ts
(role !== "admin" && role !== "operator" && role !== "auditor" && role !== "editor")
```

- [ ] **Step 3: Extend database account role typing**

In `lib/server/auth-store.ts`, change:

```ts
type AccountRole = "admin" | "operator" | "auditor" | "fighter" | "editor";
```

No SQL changes are made in this task; the enum migration arrives in Task 2.

- [ ] **Step 4: Add blog access helpers**

In `lib/server/admin-access.ts`, change:

```ts
export type AdminBackofficeRole = "admin" | "operator" | "auditor" | "editor";
```

Add helpers:

```ts
export function canAccessBlogAdmin(role: AdminBackofficeRole) {
  return role === "admin" || role === "editor";
}

export function canAccessAnyDatabase(role: AdminBackofficeRole) {
  return role !== "editor";
}
```

Update default redirects:

```ts
export function getAdminDefaultRedirectPathForRole(role: AdminBackofficeRole) {
  if (role === "auditor") {
    return "/admin/database";
  }

  if (role === "editor") {
    return "/admin/blog";
  }

  return "/admin/fantasy";
}
```

Update database access:

```ts
export function getVisibleAdminDatabaseTableIds(
  role: AdminBackofficeRole,
): readonly AdminDatabaseTableId[] {
  if (role === "auditor") {
    return AUDITOR_DATABASE_TABLE_IDS;
  }

  if (role === "editor") {
    return [];
  }

  return FULL_DATABASE_TABLE_IDS;
}

export function canAccessAdminDatabaseTable(
  role: AdminBackofficeRole,
  tableId: AdminDatabaseTableId,
) {
  return canAccessAnyDatabase(role) && getVisibleAdminDatabaseTableIds(role).includes(tableId);
}
```

- [ ] **Step 5: Allow editor sessions**

In `lib/server/admin-session.ts`, change both accepted role arrays:

```ts
acceptedRoles: ["admin", "operator", "auditor", "editor"],
```

This appears in `getSessionAccountFromToken`.

- [ ] **Step 6: Allow editor login and redirect**

In `app/api/admin/session/route.ts`, update database login:

```ts
acceptedRoles: ["admin", "operator", "auditor", "editor"],
```

The existing `getAdminDefaultRedirectPathForRole` call will send editors to `/admin/blog` after Step 4.

- [ ] **Step 7: Add Blog to admin topbar**

In `app/components/admin-topbar.tsx`, add the Blog item first:

```ts
const adminNavigationItems = [
  {
    href: "/admin/blog",
    id: "blog",
    label: "Blog"
  },
  {
    href: "/admin/fantasy",
    id: "fantasy",
    label: "Fantasy"
  },
  {
    href: "/admin/database",
    id: "database",
    label: "Banco"
  }
] as const;
```

Update `AdminTopbarProps` to use the expanded id union and filter by role:

```ts
const navigationItems =
  role === "editor"
    ? adminNavigationItems.filter((item) => item.id === "blog")
    : role === "auditor"
      ? adminNavigationItems.filter((item) => item.id === "database")
      : adminNavigationItems;
```

Change the public action cluster so Blog is visible:

```tsx
<Link className={styles.secondaryLink} href="/blog">
  Blog publico
</Link>
<Link className={styles.secondaryLink} href="/fantasy">
  Fantasy publico
</Link>
```

- [ ] **Step 8: Document env variables**

In `.env.example`, add:

```dotenv
# Optional backoffice editor login. Editors can access only /admin/blog.
ADMIN_EDITOR_USERNAME=
ADMIN_EDITOR_PASSWORD=
```

- [ ] **Step 9: Verify**

Run:

```bash
npm run typecheck
```

Expected: TypeScript passes. If it fails because `/admin/blog` does not exist yet, create a temporary `app/admin/blog/page.tsx` with no UI:

```tsx
export default function AdminBlogPlaceholderPage() {
  return null;
}
```

Remove that temporary page in Task 5 when the real page is created.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .env.example lib/admin/auth.ts lib/server/auth-store.ts lib/server/admin-access.ts lib/server/admin-session.ts app/api/admin/session/route.ts app/components/admin-topbar.tsx app/admin/blog/page.tsx
git commit -m "feat: add blog editor admin role"
```

---

## Task 2: Add Blog Database Schema

**Files:**
- Create: `db/migrations/0012_blog_editorial_cms.sql`
- Test: inspect SQL and run application typecheck

- [ ] **Step 1: Create migration**

Create `db/migrations/0012_blog_editorial_cms.sql`:

```sql
begin;

alter type app.account_role_enum add value if not exists 'editor';

do $$
begin
  create type app.blog_post_status_enum as enum ('draft', 'published');
exception
  when duplicate_object then null;
end;
$$;

create table if not exists app.blog_media (
  id uuid primary key default gen_random_uuid(),
  storage_provider text not null default 's3',
  storage_bucket text not null,
  object_key text not null,
  public_url text,
  original_file_name text not null,
  content_type text not null,
  byte_size bigint not null,
  width integer,
  height integer,
  alt_text text,
  caption text,
  created_by_account_id uuid references app.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (storage_bucket, object_key),
  check (byte_size > 0),
  check (width is null or width > 0),
  check (height is null or height > 0),
  check (char_length(original_file_name) between 1 and 240),
  check (char_length(content_type) between 3 and 120),
  check (alt_text is null or char_length(alt_text) <= 240),
  check (caption is null or char_length(caption) <= 500)
);

create table if not exists app.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  cover_media_id uuid references app.blog_media (id) on delete set null,
  cover_alt_text text,
  cover_caption text,
  author_name text not null default 'Equipe Money Moicano MMA',
  status app.blog_post_status_enum not null default 'draft',
  is_featured boolean not null default false,
  content_blocks jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  canonical_url_override text,
  noindex boolean not null default false,
  internal_keywords text[] not null default '{}'::text[],
  social_title text,
  social_description text,
  social_media_id uuid references app.blog_media (id) on delete set null,
  word_count integer not null default 0,
  reading_time_minutes integer not null default 1,
  created_by_account_id uuid references app.accounts (id) on delete set null,
  updated_by_account_id uuid references app.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (char_length(title) between 3 and 140),
  check (char_length(description) between 40 and 260),
  check (cover_alt_text is null or char_length(cover_alt_text) between 3 and 240),
  check (cover_caption is null or char_length(cover_caption) <= 500),
  check (char_length(author_name) between 2 and 120),
  check (seo_title is null or char_length(seo_title) <= 160),
  check (seo_description is null or char_length(seo_description) <= 260),
  check (social_title is null or char_length(social_title) <= 160),
  check (social_description is null or char_length(social_description) <= 260),
  check (word_count >= 0),
  check (reading_time_minutes >= 1)
);

create table if not exists app.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (char_length(name) between 2 and 80)
);

create table if not exists app.blog_post_tags (
  post_id uuid not null references app.blog_posts (id) on delete cascade,
  tag_id uuid not null references app.blog_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag_id)
);

create table if not exists app.blog_slug_redirects (
  id uuid primary key default gen_random_uuid(),
  old_slug text not null unique,
  post_id uuid not null references app.blog_posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists blog_posts_one_featured_published_idx
  on app.blog_posts (is_featured)
  where is_featured = true and status = 'published';

create index if not exists blog_posts_public_chronological_idx
  on app.blog_posts (published_at desc, id)
  where status = 'published';

create index if not exists blog_posts_updated_at_idx
  on app.blog_posts (updated_at desc);

create index if not exists blog_post_tags_tag_id_idx
  on app.blog_post_tags (tag_id, post_id);

create index if not exists blog_media_created_at_idx
  on app.blog_media (created_at desc);

alter table app.blog_media enable row level security;
alter table app.blog_media force row level security;
alter table app.blog_posts enable row level security;
alter table app.blog_posts force row level security;
alter table app.blog_tags enable row level security;
alter table app.blog_tags force row level security;
alter table app.blog_post_tags enable row level security;
alter table app.blog_post_tags force row level security;
alter table app.blog_slug_redirects enable row level security;
alter table app.blog_slug_redirects force row level security;

create policy blog_media_read_policy
on app.blog_media
for select
using ((select app.is_internal_read_role()) or (select app.is_public_api_role()));

create policy blog_media_write_policy
on app.blog_media
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_posts_read_policy
on app.blog_posts
for select
using ((select app.is_internal_read_role()) or (status = 'published' and not noindex));

create policy blog_posts_write_policy
on app.blog_posts
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_tags_read_policy
on app.blog_tags
for select
using ((select app.is_internal_read_role()) or (select app.is_public_api_role()));

create policy blog_tags_write_policy
on app.blog_tags
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_post_tags_read_policy
on app.blog_post_tags
for select
using ((select app.is_internal_read_role()) or (select app.is_public_api_role()));

create policy blog_post_tags_write_policy
on app.blog_post_tags
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_slug_redirects_read_policy
on app.blog_slug_redirects
for select
using ((select app.is_internal_read_role()) or (select app.is_public_api_role()));

create policy blog_slug_redirects_write_policy
on app.blog_slug_redirects
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

grant select on app.blog_media, app.blog_posts, app.blog_tags, app.blog_post_tags, app.blog_slug_redirects
  to mmmma_public_api, mmmma_backoffice, mmmma_service;

grant insert, update, delete on app.blog_media, app.blog_posts, app.blog_tags, app.blog_post_tags, app.blog_slug_redirects
  to mmmma_backoffice, mmmma_service;

commit;
```

- [ ] **Step 2: Verify SQL avoids unsafe constraint syntax**

Run:

```bash
rg -n "add constraint if not exists" db/migrations/0012_blog_editorial_cms.sql
```

Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add db/migrations/0012_blog_editorial_cms.sql
git commit -m "feat: add blog cms schema"
```

---

## Task 3: Add Blog Contracts, Block Helpers, and Tests

**Files:**
- Create: `lib/contracts/blog.ts`
- Create: `scripts/blog-contracts.test.ts`
- Test: `npm run test:blog`

- [ ] **Step 1: Write failing contract tests**

Create `scripts/blog-contracts.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  blockToMarkdown,
  calculateBlogReadingMetrics,
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

  it("parses a save payload into stable normalized fields", () => {
    const parsed = parseBlogPostSavePayload({
      title: "  Novo Post ",
      slug: "Novo Post",
      description: "Descricao longa o suficiente para ser usada no blog publico.",
      authorName: "",
      tags: ["MMA", " mma ", "Bastidores"],
      contentBlocks: [{ id: "p1", type: "paragraph", text: "Primeiro paragrafo." }]
    });

    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.data.title, "Novo Post");
      assert.equal(parsed.data.slug, "novo-post");
      assert.deepEqual(parsed.data.tags, ["MMA", "Bastidores"]);
      assert.equal(parsed.data.authorName, "Equipe Money Moicano MMA");
    }
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test:blog
```

Expected: FAIL because `lib/contracts/blog.ts` does not exist.

- [ ] **Step 3: Implement contracts**

Create `lib/contracts/blog.ts` with these exports:

```ts
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

export type BlogPostSavePayload = {
  title: string;
  slug: string;
  description: string;
  authorName: string;
  coverMediaId: string | null;
  coverAltText: string;
  coverCaption: string;
  isFeatured: boolean;
  contentBlocks: BlogContentBlock[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  canonicalUrlOverride: string;
  noindex: boolean;
  internalKeywords: string[];
  socialTitle: string;
  socialDescription: string;
  socialMediaId: string | null;
};

type ParseResult<TData> =
  | { ok: true; data: TData }
  | { ok: false; message: string };

const SLUG_SEPARATORS = /[^a-z0-9]+/g;
const MULTIPLE_DASHES = /-+/g;
const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

function normalizeText(input: unknown) {
  return typeof input === "string" ? input.trim().replace(/\s+/g, " ") : "";
}

function normalizeOptionalId(input: unknown) {
  const value = normalizeText(input);
  return value || null;
}

export function normalizeBlogSlug(input: unknown) {
  return normalizeText(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(SLUG_SEPARATORS, "-")
    .replace(MULTIPLE_DASHES, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeBlogTag(input: unknown) {
  return normalizeBlogSlug(input);
}

export function normalizeBlogTagName(input: unknown) {
  return normalizeText(input);
}

function dedupeTags(input: unknown) {
  const rawTags = Array.isArray(input) ? input : [];
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const rawTag of rawTags) {
    const tagName = normalizeBlogTagName(rawTag);
    const tagSlug = normalizeBlogTag(tagName);

    if (!tagName || !tagSlug || seen.has(tagSlug)) {
      continue;
    }

    seen.add(tagSlug);
    tags.push(tagName);
  }

  return tags;
}

function normalizeBlock(input: unknown): BlogContentBlock | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;
  const id = normalizeText(record.id) || crypto.randomUUID();
  const type = normalizeText(record.type);

  if (type === "paragraph") {
    const text = normalizeText(record.text);
    return text ? { id, type: "paragraph", text } : null;
  }

  if (type === "heading") {
    const text = normalizeText(record.text);
    const level = record.level === 3 ? 3 : 2;
    return text ? { id, type: "heading", level, text } : null;
  }

  if (type === "list") {
    const items = (Array.isArray(record.items) ? record.items : [])
      .map(normalizeText)
      .filter(Boolean);
    const style = record.style === "ordered" ? "ordered" : "unordered";
    return items.length ? { id, type: "list", style, items } : null;
  }

  if (type === "quote") {
    const text = normalizeText(record.text);
    const cite = normalizeText(record.cite);
    return text ? { id, type: "quote", text, cite: cite || undefined } : null;
  }

  if (type === "image") {
    const mediaId = normalizeText(record.mediaId);
    const url = normalizeText(record.url);
    const altText = normalizeText(record.altText);
    const caption = normalizeText(record.caption);
    return mediaId && url && altText
      ? { id, type: "image", mediaId, url, altText, caption: caption || undefined }
      : null;
  }

  if (type === "embed") {
    const url = normalizeText(record.url);
    const provider = record.provider === "instagram" ? "instagram" : "youtube";
    const title = normalizeText(record.title);
    return url ? { id, type: "embed", provider, url, title: title || undefined } : null;
  }

  if (type === "button") {
    const label = normalizeText(record.label);
    const url = normalizeText(record.url);
    return label && url ? { id, type: "button", label, url } : null;
  }

  return null;
}

export function normalizeBlogBlocks(input: unknown) {
  return (Array.isArray(input) ? input : [])
    .map(normalizeBlock)
    .filter((block): block is BlogContentBlock => Boolean(block));
}

export function calculateBlogReadingMetrics(blocks: readonly BlogContentBlock[]) {
  const text = blocks
    .flatMap((block) => {
      if (block.type === "list") {
        return block.items;
      }

      if ("text" in block) {
        return [block.text];
      }

      return [];
    })
    .join(" ");
  const wordCount = text.match(WORD_PATTERN)?.length ?? 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return { wordCount, readingTimeMinutes };
}

export function blockToMarkdown(block: BlogContentBlock) {
  if (block.type === "paragraph") {
    return block.text;
  }

  if (block.type === "heading") {
    return `${"#".repeat(block.level)} ${block.text}`;
  }

  if (block.type === "list") {
    return block.items
      .map((item, index) => (block.style === "ordered" ? `${index + 1}. ${item}` : `- ${item}`))
      .join("\n");
  }

  if (block.type === "quote") {
    return [`> ${block.text}`, block.cite ? `>\n> ${block.cite}` : ""].filter(Boolean).join("\n");
  }

  if (block.type === "image") {
    return `![${block.altText}](${block.url})${block.caption ? `\n\n_${block.caption}_` : ""}`;
  }

  if (block.type === "embed") {
    return `[${block.title || block.provider}](${block.url})`;
  }

  return `[${block.label}](${block.url})`;
}

export function blocksToMarkdown(blocks: readonly BlogContentBlock[]) {
  return blocks.map(blockToMarkdown).join("\n\n");
}

export function parseBlogPostSavePayload(input: unknown): ParseResult<BlogPostSavePayload> {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Corpo da requisicao invalido." };
  }

  const record = input as Record<string, unknown>;
  const title = normalizeText(record.title);
  const slug = normalizeBlogSlug(record.slug || title);
  const description = normalizeText(record.description);
  const contentBlocks = normalizeBlogBlocks(record.contentBlocks);

  if (!title || !slug) {
    return { ok: false, message: "Titulo e slug sao obrigatorios." };
  }

  return {
    ok: true,
    data: {
      title,
      slug,
      description,
      authorName: normalizeText(record.authorName) || BLOG_DEFAULT_AUTHOR,
      coverMediaId: normalizeOptionalId(record.coverMediaId),
      coverAltText: normalizeText(record.coverAltText),
      coverCaption: normalizeText(record.coverCaption),
      isFeatured: record.isFeatured === true,
      contentBlocks,
      tags: dedupeTags(record.tags),
      seoTitle: normalizeText(record.seoTitle),
      seoDescription: normalizeText(record.seoDescription),
      canonicalUrlOverride: normalizeText(record.canonicalUrlOverride),
      noindex: record.noindex === true,
      internalKeywords: dedupeTags(record.internalKeywords),
      socialTitle: normalizeText(record.socialTitle),
      socialDescription: normalizeText(record.socialDescription),
      socialMediaId: normalizeOptionalId(record.socialMediaId)
    }
  };
}

export function validateBlogPostForPublish(input: {
  title: string;
  slug: string;
  description: string;
  authorName: string;
  coverMediaId: string | null;
  coverAltText: string;
  contentBlocks: BlogContentBlock[];
  tags: string[];
}): ParseResult<true> {
  if (input.title.length < 3) {
    return { ok: false, message: "Titulo e obrigatorio." };
  }

  if (!input.slug) {
    return { ok: false, message: "Slug e obrigatorio." };
  }

  if (input.description.length < 40) {
    return { ok: false, message: "Descricao precisa ter mais contexto." };
  }

  if (!input.coverMediaId) {
    return { ok: false, message: "Imagem de capa e obrigatoria." };
  }

  if (input.coverAltText.length < 3) {
    return { ok: false, message: "Alt text da capa e obrigatorio." };
  }

  if (!input.authorName) {
    return { ok: false, message: "Autor e obrigatorio." };
  }

  if (!input.contentBlocks.length) {
    return { ok: false, message: "Adicione pelo menos um bloco de conteudo." };
  }

  return { ok: true, data: true };
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm run test:blog
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/contracts/blog.ts scripts/blog-contracts.test.ts package.json package-lock.json
git commit -m "feat: add blog content contracts"
```

---

## Task 4: Add Blog Server Repository and Upload Routes

**Files:**
- Create: `lib/server/blog-media-storage.ts`
- Create: `lib/server/blog.ts`
- Create: `app/api/admin/blog/posts/route.ts`
- Create: `app/api/admin/blog/posts/[postId]/route.ts`
- Create: `app/api/admin/blog/uploads/route.ts`
- Create: `app/api/admin/blog/tags/route.ts`
- Test: `npm run typecheck`

- [ ] **Step 1: Add blog media storage helper**

Create `lib/server/blog-media-storage.ts` using the existing S3/R2 env:

```ts
import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  getServerEnv,
  isFighterPhotoStorageConfigured,
  type ServerEnv
} from "@/lib/server/env";

export type BlogMediaUploadTarget = {
  uploadUrl: string;
  bucket: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  storageProvider: string;
  publicUrl: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __mmmmaBlogMediaS3Client: S3Client | undefined;
}

function getS3Client(env: ServerEnv) {
  if (!globalThis.__mmmmaBlogMediaS3Client) {
    globalThis.__mmmmaBlogMediaS3Client = new S3Client({
      region: env.fighterPhotosStorageRegion,
      endpoint: env.fighterPhotosStorageEndpoint ?? undefined,
      forcePathStyle: env.fighterPhotosStorageForcePathStyle,
      credentials: {
        accessKeyId: env.fighterPhotosStorageAccessKeyId!,
        secretAccessKey: env.fighterPhotosStorageSecretAccessKey!
      }
    });
  }

  return globalThis.__mmmmaBlogMediaS3Client;
}

function resolvePublicUrl(objectKey: string) {
  const assetBaseUrl = process.env.NEXT_PUBLIC_SITE_ASSET_BASE_URL?.trim().replace(/\/+$/, "");

  return assetBaseUrl ? `${assetBaseUrl}/${objectKey}` : null;
}

function resolveBlogObjectKey(fileName: string, scope: string) {
  const extension = path.extname(fileName).toLowerCase() || ".bin";
  const safeScope = scope.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 80) || "draft";

  return `blog/${safeScope}/${randomUUID()}${extension}`;
}

export async function createBlogMediaUploadTarget(options: {
  byteSize: number;
  contentType: string;
  fileName: string;
  scope: string;
  env?: ServerEnv;
}): Promise<BlogMediaUploadTarget> {
  const env = options.env ?? getServerEnv();

  if (!isFighterPhotoStorageConfigured(env)) {
    throw new Error("Blog media storage is not configured.");
  }

  const bucket = env.fighterPhotosStorageBucket!;
  const objectKey = resolveBlogObjectKey(options.fileName, options.scope);
  const uploadUrl = await getSignedUrl(
    getS3Client(env),
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: options.contentType
    }),
    { expiresIn: 10 * 60 }
  );

  return {
    uploadUrl,
    bucket,
    objectKey,
    contentType: options.contentType,
    byteSize: options.byteSize,
    storageProvider: env.fighterPhotosStorageProvider,
    publicUrl: resolvePublicUrl(objectKey)
  };
}
```

- [ ] **Step 2: Add repository module**

Create `lib/server/blog.ts` with these exact exported functions and keep SQL query aliases camelCase:

```ts
import "server-only";

import { notFound, redirect } from "next/navigation";

import {
  BLOG_DEFAULT_AUTHOR,
  blocksToMarkdown,
  calculateBlogReadingMetrics,
  normalizeBlogSlug,
  normalizeBlogTag,
  normalizeBlogTagName,
  parseBlogPostSavePayload,
  validateBlogPostForPublish,
  type BlogContentBlock
} from "@/lib/contracts/blog";
import type { AdminSessionIdentity } from "@/lib/server/admin-session";
import { queryDatabase, withDatabaseTransaction } from "@/lib/server/database";
import type { RequestAuditContext } from "@/lib/server/request-context";

export type BlogPostSummary = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "published";
  isFeatured: boolean;
  authorName: string;
  coverUrl: string | null;
  coverAltText: string | null;
  tags: Array<{ name: string; slug: string }>;
  publishedAt: string | null;
  updatedAt: string;
  readingTimeMinutes: number;
};

export type BlogPostDetail = BlogPostSummary & {
  coverCaption: string | null;
  contentBlocks: BlogContentBlock[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrlOverride: string | null;
  noindex: boolean;
  internalKeywords: string[];
  socialTitle: string | null;
  socialDescription: string | null;
  markdown: string;
};
```

Then implement these exports with concrete SQL in the same file:

```ts
export async function listAdminBlogPosts(): Promise<BlogPostSummary[]>;
export async function createBlogDraft(
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<string>;
export async function getAdminBlogPost(postId: string): Promise<BlogPostDetail | null>;
export async function saveAdminBlogPost(
  postId: string,
  input: unknown,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<{ ok: true; post: BlogPostDetail } | { ok: false; message: string }>;
export async function publishAdminBlogPost(
  postId: string,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<{ ok: true; post: BlogPostDetail } | { ok: false; message: string }>;
export async function unpublishAdminBlogPost(
  postId: string,
  identity: AdminSessionIdentity,
  requestContext: RequestAuditContext
): Promise<{ ok: true; post: BlogPostDetail } | { ok: false; message: string }>;
export async function listPublicBlogPosts(): Promise<{
  featured: BlogPostSummary | null;
  posts: BlogPostSummary[];
  tags: Array<{ name: string; slug: string; count: number }>;
}>;
export async function getPublicBlogPostBySlug(slug: string): Promise<BlogPostDetail | null>;
export async function getBlogRedirectForSlug(slug: string): Promise<string | null>;
export async function listPublicBlogPostsByTag(
  tagSlug: string
): Promise<{ tag: { name: string; slug: string }; posts: BlogPostSummary[] } | null>;
export async function listBlogTagSuggestions(): Promise<Array<{ name: string; slug: string; count: number }>>;
export async function listBlogSitemapEntries(): Promise<Array<{ href: string; updatedAt: Date }>>;
export async function getBlogLlmsIndex(): Promise<string>;
```

Use these SQL patterns:

```sql
select
  p.id,
  p.title,
  p.slug,
  p.description,
  p.status,
  p.is_featured as "isFeatured",
  p.author_name as "authorName",
  m.public_url as "coverUrl",
  p.cover_alt_text as "coverAltText",
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
where p.status = 'published'
group by p.id, m.public_url
order by p.published_at desc nulls last, p.updated_at desc
```

Use `withDatabaseTransaction()` for write functions. When saving `isFeatured = true`, clear other featured posts inside the same transaction:

```sql
update app.blog_posts
set is_featured = false
where id <> $1
  and status = 'published'
  and is_featured = true
```

When changing a published slug, insert into `app.blog_slug_redirects`.

- [ ] **Step 3: Add admin JSON response helper in routes**

Each new admin route should use:

```ts
function buildJsonResponse(payload: object, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
```

- [ ] **Step 4: Implement `/api/admin/blog/posts`**

Create `app/api/admin/blog/posts/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

import { canAccessBlogAdmin } from "@/lib/server/admin-access";
import { getCurrentAdminSessionIdentity } from "@/lib/server/admin-session";
import { createBlogDraft, listAdminBlogPosts } from "@/lib/server/blog";
import { getServerEnv } from "@/lib/server/env";
import { buildRequestAuditContext } from "@/lib/server/request-context";
import { isSameOriginRequest } from "@/lib/server/request-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildJsonResponse(payload: object, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

async function requireBlogIdentity() {
  const identity = await getCurrentAdminSessionIdentity(getServerEnv());

  return identity && canAccessBlogAdmin(identity.role) ? identity : null;
}

export async function GET() {
  const identity = await requireBlogIdentity();

  if (!identity) {
    return buildJsonResponse({ ok: false, message: "Sem permissao para acessar o blog." }, 403);
  }

  return buildJsonResponse({ ok: true, posts: await listAdminBlogPosts() });
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return buildJsonResponse({ ok: false, message: "Origem nao permitida." }, 403);
  }

  const identity = await requireBlogIdentity();

  if (!identity) {
    return buildJsonResponse({ ok: false, message: "Sem permissao para criar posts." }, 403);
  }

  const postId = await createBlogDraft(identity, buildRequestAuditContext(request));

  return buildJsonResponse({ ok: true, postId });
}
```

- [ ] **Step 5: Implement post detail route**

Create `app/api/admin/blog/posts/[postId]/route.ts` with `GET`, `PATCH`, and `POST`.

Supported `POST` actions:

```ts
type BlogPostActionBody = {
  action?: "publish" | "unpublish";
};
```

Use `readJsonRequestBody` with `maxBytes: 768 * 1024`. `PATCH` calls `saveAdminBlogPost`; `POST` dispatches to publish/unpublish.

- [ ] **Step 6: Implement uploads route**

Create `app/api/admin/blog/uploads/route.ts`. It must require same-origin, blog identity, configured storage, parse a body shaped as:

```ts
type BlogUploadRequestBody = {
  fileName?: string;
  contentType?: string;
  byteSize?: number;
  scope?: string;
};
```

Accept only `image/jpeg`, `image/png`, `image/webp` and files up to `8 * 1024 * 1024` bytes. Call `createBlogMediaUploadTarget`.

- [ ] **Step 7: Implement tags route**

Create `app/api/admin/blog/tags/route.ts`. It must require blog identity and return:

```ts
{ ok: true, tags: await listBlogTagSuggestions() }
```

- [ ] **Step 8: Verify**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/server/blog-media-storage.ts lib/server/blog.ts app/api/admin/blog
git commit -m "feat: add blog admin server routes"
```

---

## Task 5: Build Admin Blog List and Editor UI

**Files:**
- Create: `app/admin/blog/page.tsx`
- Create: `app/admin/blog/page.module.css`
- Create: `app/admin/blog/novo/page.tsx`
- Create: `app/admin/blog/[postId]/page.tsx`
- Create: `app/admin/blog/[postId]/page.module.css`
- Create: `app/components/blog-admin-dashboard.tsx`
- Create: `app/components/blog-admin-dashboard.module.css`
- Create: `app/components/blog-post-editor.tsx`
- Create: `app/components/blog-post-editor.module.css`
- Test: `npm run typecheck`

- [ ] **Step 1: Create admin blog page**

Create `app/admin/blog/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminTopbar } from "@/app/components/admin-topbar";
import { BlogAdminDashboard } from "@/app/components/blog-admin-dashboard";
import { LandingMotionController } from "@/app/components/landing-motion-controller";
import { canAccessBlogAdmin, getAdminDefaultRedirectPathForRole } from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { listAdminBlogPosts, listBlogTagSuggestions } from "@/lib/server/blog";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Admin Blog | Money Moicano MMA",
  description: "Painel editorial para criar, editar e publicar posts do Money Moicano MMA.",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const identity = await requireAdminSessionIdentity("/admin/blog");

  if (!canAccessBlogAdmin(identity.role)) {
    redirect(getAdminDefaultRedirectPathForRole(identity.role));
  }

  const [posts, tags] = await Promise.all([listAdminBlogPosts(), listBlogTagSuggestions()]);

  return (
    <main className={styles.page}>
      <LandingMotionController />
      <AdminTopbar active="blog" role={identity.role} />
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy} data-reveal>
            <p className={styles.eyebrow}>Redacao</p>
            <h1 className={styles.title}>
              Admin do
              <span className={styles.titleAccent}>Blog</span>
            </h1>
            <p className={styles.heroBody}>
              Crie materias, organize tags, publique destaques e mantenha a camada de SEO pronta
              para Google e experiencias de busca por IA.
            </p>
          </div>
        </div>
      </section>
      <section className={styles.dashboardSection}>
        <div className={styles.dashboardShell} data-reveal>
          <BlogAdminDashboard initialPosts={posts} initialTags={tags} />
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create draft route**

Create `app/admin/blog/novo/page.tsx`:

```tsx
import { redirect } from "next/navigation";

import { canAccessBlogAdmin, getAdminDefaultRedirectPathForRole } from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { createBlogDraft } from "@/lib/server/blog";
import { buildSyntheticRequestContext } from "@/lib/server/request-context";

export const dynamic = "force-dynamic";

export default async function NewBlogPostPage() {
  const identity = await requireAdminSessionIdentity("/admin/blog/novo");

  if (!canAccessBlogAdmin(identity.role)) {
    redirect(getAdminDefaultRedirectPathForRole(identity.role));
  }

  const postId = await createBlogDraft(identity, buildSyntheticRequestContext("admin-blog-new"));

  redirect(`/admin/blog/${postId}`);
}
```

If `buildSyntheticRequestContext` does not exist, add this function to `lib/server/request-context.ts`:

```ts
export function buildSyntheticRequestContext(source: string): RequestAuditContext {
  return {
    requestId: `${source}:${crypto.randomUUID()}`,
    clientIp: null,
    requestOrigin: null,
    userAgent: null
  };
}
```

- [ ] **Step 3: Create editor page**

Create `app/admin/blog/[postId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdminTopbar } from "@/app/components/admin-topbar";
import { BlogPostEditor } from "@/app/components/blog-post-editor";
import { canAccessBlogAdmin, getAdminDefaultRedirectPathForRole } from "@/lib/server/admin-access";
import { requireAdminSessionIdentity } from "@/lib/server/admin-session";
import { getAdminBlogPost, listBlogTagSuggestions } from "@/lib/server/blog";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Editar post | Money Moicano MMA",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function AdminBlogPostPage({
  params
}: Readonly<{
  params: Promise<{ postId: string }>;
}>) {
  const { postId } = await params;
  const identity = await requireAdminSessionIdentity(`/admin/blog/${postId}`);

  if (!canAccessBlogAdmin(identity.role)) {
    redirect(getAdminDefaultRedirectPathForRole(identity.role));
  }

  const [post, tags] = await Promise.all([getAdminBlogPost(postId), listBlogTagSuggestions()]);

  if (!post) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <AdminTopbar active="blog" role={identity.role} />
      <BlogPostEditor initialPost={post} tagSuggestions={tags} />
    </main>
  );
}
```

- [ ] **Step 4: Build admin dashboard client**

Create `app/components/blog-admin-dashboard.tsx` as a client component. Required state:

```ts
type FilterState = {
  query: string;
  status: "all" | "draft" | "published";
  tag: string;
  author: string;
};
```

Render:

- new-post link to `/admin/blog/novo`;
- search input;
- status select;
- tag select;
- table/list of posts with title, status, featured marker, tags, author, updated date;
- edit link to `/admin/blog/${post.id}`;
- public link to `/blog/${post.slug}` only for published posts.

Use `useMemo` for filtered posts and `startTransition` for navigation-refresh flows.

- [ ] **Step 5: Build editor client**

Create `app/components/blog-post-editor.tsx` as a client component. It must maintain a draft object shaped like `BlogPostSavePayload`, plus notice and saving state.

Core handlers:

```ts
async function savePost() {
  const response = await fetch(`/api/admin/blog/posts/${initialPost.id}`, {
    method: "PATCH",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(draft),
    cache: "no-store"
  });
  // update notice and local draft from response
}

async function publishPost() {
  const response = await fetch(`/api/admin/blog/posts/${initialPost.id}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "publish" }),
    cache: "no-store"
  });
  // update notice and status
}

async function unpublishPost() {
  const response = await fetch(`/api/admin/blog/posts/${initialPost.id}`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unpublish" }),
    cache: "no-store"
  });
  // update notice and status
}
```

Block controls required in the first version:

- add paragraph;
- add H2;
- add H3;
- add unordered list;
- add quote;
- add image block;
- add YouTube embed;
- add Instagram embed;
- add button/link;
- move block up/down;
- remove block.

The cover upload flow must:

1. call `/api/admin/blog/uploads`;
2. PUT the file to `uploadUrl`;
3. set cover fields using returned `publicUrl`, `bucket`, and `objectKey`;
4. save the media metadata through the post save route or a repository helper.

Use localStorage key `mmmma-blog-draft:${initialPost.id}` for autosave. Store only the draft payload and a `savedAt` number.

- [ ] **Step 6: Add CSS modules**

Use the existing dark admin visual language from `app/admin/fantasy/page.module.css` and `app/components/fantasy-admin-dashboard.module.css`. The editor layout must be:

- full-width dark page;
- editor column minmax `0, 1fr`;
- sticky right panel at desktop widths;
- single-column layout below 960px;
- no nested cards inside cards.

- [ ] **Step 7: Verify**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add app/admin/blog app/components/blog-admin-dashboard.tsx app/components/blog-admin-dashboard.module.css app/components/blog-post-editor.tsx app/components/blog-post-editor.module.css lib/server/request-context.ts
git commit -m "feat: add blog editorial admin"
```

---

## Task 6: Build Public Blog Pages and Rendering

**Files:**
- Create: `lib/blog/rendering.tsx`
- Create: `lib/blog/metadata.ts`
- Create: `app/blog/page.tsx`
- Create: `app/blog/page.module.css`
- Create: `app/blog/[slug]/page.tsx`
- Create: `app/blog/[slug]/page.module.css`
- Create: `app/blog/tags/[tagSlug]/page.tsx`
- Test: `npm run typecheck`

- [ ] **Step 1: Add block renderer**

Create `lib/blog/rendering.tsx`:

```tsx
import Image from "next/image";

import type { BlogContentBlock } from "@/lib/contracts/blog";

export function BlogBlocks({ blocks }: Readonly<{ blocks: readonly BlogContentBlock[] }>) {
  return (
    <>
      {blocks.map((block) => {
        if (block.type === "paragraph") {
          return <p key={block.id}>{block.text}</p>;
        }

        if (block.type === "heading") {
          return block.level === 3 ? <h3 key={block.id}>{block.text}</h3> : <h2 key={block.id}>{block.text}</h2>;
        }

        if (block.type === "list") {
          const children = block.items.map((item) => <li key={item}>{item}</li>);
          return block.style === "ordered" ? <ol key={block.id}>{children}</ol> : <ul key={block.id}>{children}</ul>;
        }

        if (block.type === "quote") {
          return (
            <blockquote key={block.id}>
              <p>{block.text}</p>
              {block.cite ? <cite>{block.cite}</cite> : null}
            </blockquote>
          );
        }

        if (block.type === "image") {
          return (
            <figure key={block.id}>
              <Image alt={block.altText} height={720} src={block.url} width={1280} />
              {block.caption ? <figcaption>{block.caption}</figcaption> : null}
            </figure>
          );
        }

        if (block.type === "embed") {
          return (
            <p key={block.id}>
              <a href={block.url}>{block.title || block.url}</a>
            </p>
          );
        }

        return (
          <p key={block.id}>
            <a href={block.url}>{block.label}</a>
          </p>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Add metadata helpers**

Create `lib/blog/metadata.ts` with:

```ts
import type { Metadata } from "next";

import type { BlogPostDetail } from "@/lib/server/blog";
import { siteLanguage, siteName, siteUrl } from "@/lib/site";

export function createBlogPostMetadata(post: BlogPostDetail): Metadata {
  const title = post.seoTitle || `${post.title} | ${siteName}`;
  const description = post.seoDescription || post.description;
  const canonical = post.canonicalUrlOverride || `/blog/${post.slug}`;
  const image = post.coverUrl || "/opengraph-image";

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: !post.noindex,
      follow: !post.noindex,
      googleBot: {
        index: !post.noindex,
        follow: !post.noindex,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1
      }
    },
    openGraph: {
      type: "article",
      siteName,
      title: post.socialTitle || title,
      description: post.socialDescription || description,
      url: canonical,
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: [post.authorName],
      tags: post.tags.map((tag) => tag.name),
      images: [{ url: image, alt: post.coverAltText || post.title }]
    },
    twitter: {
      card: "summary_large_image",
      title: post.socialTitle || title,
      description: post.socialDescription || description,
      images: [image]
    }
  };
}

export function createBlogPostJsonLd(post: BlogPostDetail) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: post.coverUrl ? [`${siteUrl}${post.coverUrl.startsWith("/") ? post.coverUrl : new URL(post.coverUrl).pathname}`] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@type": "Organization", name: siteName },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
    inLanguage: siteLanguage,
    keywords: post.tags.map((tag) => tag.name).join(", ")
  };
}
```

- [ ] **Step 3: Create blog listing**

Create `app/blog/page.tsx`. Use `createPageMetadata` for listing metadata, call `listPublicBlogPosts`, render featured post first, chronological posts next, and tags aside. If no posts exist, render an empty state with no fake posts.

- [ ] **Step 4: Create post page**

Create `app/blog/[slug]/page.tsx`. It must:

- normalize incoming slug with `normalizeBlogSlug`;
- call `getPublicBlogPostBySlug`;
- check `getBlogRedirectForSlug` and `redirect("/blog/new-slug")` when needed;
- `notFound()` when neither exists;
- export `generateMetadata`;
- render JSON-LD with `<script type="application/ld+json">`;
- render `BlogBlocks`.

- [ ] **Step 5: Create tag page**

Create `app/blog/tags/[tagSlug]/page.tsx`. It must call `listPublicBlogPostsByTag`, `notFound()` when null, and render posts in chronological order.

- [ ] **Step 6: Add CSS**

Create `app/blog/page.module.css` and `app/blog/[slug]/page.module.css`. Use a public editorial layout that matches the current site: dark background, red accent, strong title type, no beige palette, stable image aspect ratios, and responsive sidebars.

- [ ] **Step 7: Verify**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/blog app/blog
git commit -m "feat: add public blog pages"
```

---

## Task 7: Add Markdown, llms.txt, Sitemap, Robots, and Image Config

**Files:**
- Create: `app/blog/[slug].md/route.ts`
- Create: `app/llms.txt/route.ts`
- Modify: `app/sitemap.ts`
- Modify: `app/robots.ts`
- Modify: `next.config.ts`
- Test: `npm run typecheck`

- [ ] **Step 1: Add Markdown route**

Create `app/blog/[slug].md/route.ts`:

```ts
import { notFound } from "next/navigation";

import { normalizeBlogSlug } from "@/lib/contracts/blog";
import { getPublicBlogPostBySlug } from "@/lib/server/blog";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(normalizeBlogSlug(slug.replace(/\.md$/, "")));

  if (!post) {
    notFound();
  }

  const body = [
    `# ${post.title}`,
    post.description,
    `Autor: ${post.authorName}`,
    post.publishedAt ? `Publicado: ${post.publishedAt}` : "",
    `Tags: ${post.tags.map((tag) => tag.name).join(", ")}`,
    `Canonical: ${siteUrl}/blog/${post.slug}`,
    post.markdown
  ]
    .filter(Boolean)
    .join("\n\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
```

- [ ] **Step 2: Add llms.txt route**

Create `app/llms.txt/route.ts`:

```ts
import { getBlogLlmsIndex } from "@/lib/server/blog";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(await getBlogLlmsIndex(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300"
    }
  });
}
```

- [ ] **Step 3: Update sitemap**

In `app/sitemap.ts`, append blog dynamic entries:

```ts
import { listBlogSitemapEntries } from "@/lib/server/blog";
```

Change function to async:

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticRoutes = publicSiteRoutes.map((route) => ({
    url: `${siteUrl}${route.href}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority
  }));
  const blogRoutes = await listBlogSitemapEntries().catch(() => []);

  return [
    ...staticRoutes,
    {
      url: `${siteUrl}/blog`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.85
    },
    ...blogRoutes.map((route) => ({
      url: `${siteUrl}${route.href}`,
      lastModified: route.updatedAt,
      changeFrequency: "weekly" as const,
      priority: route.href.startsWith("/blog/tags/") ? 0.55 : 0.75
    }))
  ];
}
```

- [ ] **Step 4: Update robots**

In `app/robots.ts`, return multiple rules:

```ts
rules: [
  {
    userAgent: "*",
    allow: "/",
    disallow: ["/admin", "/atletas-da-edicao", "/api", "/mapa-do-site"]
  },
  {
    userAgent: "GPTBot",
    disallow: "/"
  },
  {
    userAgent: "OAI-SearchBot",
    allow: "/"
  },
  {
    userAgent: "PerplexityBot",
    allow: "/"
  }
],
```

- [ ] **Step 5: Update image remote patterns**

In `next.config.ts`, include `NEXT_PUBLIC_SITE_ASSET_BASE_URL` in `images.remotePatterns` if it is a valid https URL. Add helper:

```ts
function resolveRemotePattern(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return null;
    }

    return {
      protocol: "https" as const,
      hostname: url.hostname
    };
  } catch {
    return null;
  }
}
```

Use:

```ts
const blogMediaRemotePattern = resolveRemotePattern(process.env.NEXT_PUBLIC_SITE_ASSET_BASE_URL);
```

Append it in `remotePatterns` with `.filter(Boolean)`.

- [ ] **Step 6: Verify**

Run:

```bash
npm run typecheck
npm run test:blog
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add app/blog/[slug].md app/llms.txt app/sitemap.ts app/robots.ts next.config.ts
git commit -m "feat: add blog seo and llm surfaces"
```

---

## Task 8: Final Build, Browser QA, and Fixes

**Files:**
- Modify only files touched by previous tasks.
- Test: `npm run check`

- [ ] **Step 1: Run full check**

```bash
npm run check
```

Expected: type generation, TypeScript, and Next build pass.

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

Expected: server starts on `http://localhost:3000` or another available port.

- [ ] **Step 3: Verify admin access manually**

In the browser:

- log in as admin;
- open `/admin/blog`;
- create a draft;
- save title, description, author, tags, and blocks;
- upload a cover image;
- publish;
- open public post link;
- despublish;
- confirm public route no longer renders.

- [ ] **Step 4: Verify editor access manually**

With env credentials:

```dotenv
ADMIN_EDITOR_USERNAME=editor
ADMIN_EDITOR_PASSWORD=<local-secret>
```

Restart dev server, log in as editor, verify:

- `/admin/blog` opens;
- `/admin/fantasy` redirects to `/admin/blog`;
- `/admin/database` redirects to `/admin/blog`;
- `/api/admin/blog/posts` works;
- `/api/admin/fantasy/events` returns 403.

- [ ] **Step 5: Verify public surfaces**

Open:

- `/blog`;
- `/blog/[published-slug]`;
- `/blog/[published-slug].md`;
- `/blog/tags/[tag-slug]`;
- `/llms.txt`;
- `/sitemap.xml`;
- `/robots.txt`.

Expected:

- pages render without layout overflow on desktop and mobile;
- Markdown route returns text/markdown;
- llms route returns plain text;
- sitemap includes only published blog content;
- robots includes `GPTBot` block and allows public crawlers.

- [ ] **Step 6: Fix issues found in QA**

For each issue, make the smallest code change, rerun:

```bash
npm run typecheck
npm run test:blog
```

Expected: PASS after each fix batch.

- [ ] **Step 7: Final build**

```bash
npm run check
```

Expected: PASS.

- [ ] **Step 8: Commit QA fixes**

```bash
git add app lib db package.json package-lock.json next.config.ts .env.example scripts
git commit -m "fix: polish blog cms qa issues"
```

If there are no QA fixes after Task 7, skip this commit.

---

## Self-Review

Spec coverage:

- Public `/blog`, `/blog/[slug]`, `/blog/tags/[tag]`: Task 6.
- Admin `/admin/blog`, create/edit/publish/despublish: Tasks 1, 4, 5.
- `admin` and `editor` roles: Task 1 and Task 2.
- Editor env credentials: Task 1.
- Direct upload to R2/S3: Task 4 and Task 5.
- Visual block editor: Task 3 and Task 5.
- Tags created and reused: Task 2, Task 3, Task 4, Task 5.
- Author default: Task 3 and Task 4.
- Draft/published only: Task 2, Task 3, Task 4.
- Featured post: Task 2, Task 4, Task 6.
- SEO metadata/schema/sitemap/robots: Task 6 and Task 7.
- `/llms.txt` and `.md` per post: Task 7.
- Slug redirect: Task 2 and Task 4.
- Verification: Task 8.

Placeholder scan:

- The plan avoids red-flag vague tokens and unspecified file paths.
- Some UI files require normal component/CSS authoring, but all required states, routes, handlers, data shapes, and commands are specified.

Type consistency:

- `BlogPostStatus`, `BlogContentBlock`, `BlogPostSavePayload`, `BlogPostSummary`, and `BlogPostDetail` names are introduced before later tasks use them.
- Public route slugs use `slug` and tag pages use `tagSlug`.
- Admin route post identifiers use `postId`.
