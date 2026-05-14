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
  check (char_length(title) between 1 and 140),
  check (char_length(description) <= 260),
  check (jsonb_typeof(content_blocks) = 'array'),
  check (status = 'draft' or char_length(title) between 3 and 140),
  check (
    status = 'draft'
    or char_length(btrim(description)) between 40 and 260
    or char_length(btrim(coalesce(seo_description, ''))) between 40 and 260
    or char_length(btrim(coalesce(social_description, ''))) between 40 and 260
  ),
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

create trigger blog_posts_touch_updated_at
before update on app.blog_posts
for each row
execute function app.touch_updated_at();

create trigger blog_media_audit
after insert or update or delete on app.blog_media
for each row
execute function audit.log_row_change();

create trigger blog_posts_audit
after insert or update or delete on app.blog_posts
for each row
execute function audit.log_row_change();

create trigger blog_tags_audit
after insert or update or delete on app.blog_tags
for each row
execute function audit.log_row_change();

create trigger blog_post_tags_audit
after insert or update or delete on app.blog_post_tags
for each row
execute function audit.log_row_change();

create trigger blog_slug_redirects_audit
after insert or update or delete on app.blog_slug_redirects
for each row
execute function audit.log_row_change();

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
using (
  (select app.is_internal_read_role())
  or (
    (select app.is_public_api_role())
    and exists (
      select 1
      from app.blog_posts post
      where post.status = 'published'
        and (
          post.cover_media_id = app.blog_media.id
          or post.social_media_id = app.blog_media.id
          or exists (
            select 1
            from jsonb_array_elements(post.content_blocks) as block(value)
            where block.value ->> 'mediaId' = app.blog_media.id::text
          )
        )
    )
  )
);

create policy blog_media_write_policy
on app.blog_media
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_posts_read_policy
on app.blog_posts
for select
using ((select app.is_internal_read_role()) or status = 'published');

create policy blog_posts_write_policy
on app.blog_posts
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_tags_read_policy
on app.blog_tags
for select
using (
  (select app.is_internal_read_role())
  or (
    (select app.is_public_api_role())
    and exists (
      select 1
      from app.blog_post_tags post_tag
      join app.blog_posts post
        on post.id = post_tag.post_id
      where post_tag.tag_id = app.blog_tags.id
        and post.status = 'published'
    )
  )
);

create policy blog_tags_write_policy
on app.blog_tags
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_post_tags_read_policy
on app.blog_post_tags
for select
using (
  (select app.is_internal_read_role())
  or (
    (select app.is_public_api_role())
    and exists (
      select 1
      from app.blog_posts post
      where post.id = app.blog_post_tags.post_id
        and post.status = 'published'
    )
  )
);

create policy blog_post_tags_write_policy
on app.blog_post_tags
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy blog_slug_redirects_read_policy
on app.blog_slug_redirects
for select
using (
  (select app.is_internal_read_role())
  or (
    (select app.is_public_api_role())
    and exists (
      select 1
      from app.blog_posts post
      where post.id = app.blog_slug_redirects.post_id
        and post.status = 'published'
    )
  )
);

create policy blog_slug_redirects_write_policy
on app.blog_slug_redirects
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

grant select (
  id,
  storage_provider,
  storage_bucket,
  object_key,
  public_url,
  content_type,
  width,
  height,
  alt_text,
  caption,
  created_at
)
  on app.blog_media
  to mmmma_public_api;

grant select (
  id,
  title,
  slug,
  description,
  cover_media_id,
  cover_alt_text,
  cover_caption,
  author_name,
  status,
  is_featured,
  content_blocks,
  seo_title,
  seo_description,
  canonical_url_override,
  noindex,
  social_title,
  social_description,
  social_media_id,
  word_count,
  reading_time_minutes,
  created_at,
  updated_at,
  published_at
)
  on app.blog_posts
  to mmmma_public_api;

grant select (id, name, slug, created_at)
  on app.blog_tags
  to mmmma_public_api;

grant select (post_id, tag_id, created_at)
  on app.blog_post_tags
  to mmmma_public_api;

grant select (old_slug, post_id, created_at)
  on app.blog_slug_redirects
  to mmmma_public_api;

grant select on app.blog_media, app.blog_posts, app.blog_tags, app.blog_post_tags, app.blog_slug_redirects
  to mmmma_backoffice, mmmma_service;

grant insert, update, delete on app.blog_media, app.blog_posts, app.blog_tags, app.blog_post_tags, app.blog_slug_redirects
  to mmmma_backoffice, mmmma_service;

commit;
