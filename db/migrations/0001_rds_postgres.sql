begin;

create extension if not exists pgcrypto;

revoke create on schema public from public;
revoke all on schema public from public;

create schema if not exists app;
create schema if not exists audit;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'mmmma_public_api') then
    create role mmmma_public_api nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'mmmma_backoffice') then
    create role mmmma_backoffice nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'mmmma_fighter_portal') then
    create role mmmma_fighter_portal nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'mmmma_auditor') then
    create role mmmma_auditor nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'mmmma_service') then
    create role mmmma_service nologin;
  end if;
end;
$$;

do $$
begin
  create type app.account_role_enum as enum (
    'admin',
    'operator',
    'auditor',
    'fighter',
    'service'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.account_status_enum as enum (
    'invited',
    'active',
    'locked',
    'disabled'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.auth_session_kind_enum as enum (
    'backoffice',
    'fighter_portal',
    'service'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.newsletter_status_enum as enum (
    'subscribed',
    'unsubscribed',
    'bounced'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.application_status_enum as enum (
    'pending',
    'reviewing',
    'shortlisted',
    'rejected',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.partner_inquiry_status_enum as enum (
    'new',
    'contacted',
    'qualified',
    'rejected',
    'converted',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.event_status_enum as enum (
    'draft',
    'published',
    'locked',
    'finished',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.fighter_specialty_enum as enum (
    'jiu-jitsu',
    'mma',
    'muay-thai',
    'boxe',
    'kickboxing',
    'judo',
    'sanda',
    'other'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.pix_key_type_enum as enum (
    'cpf',
    'email',
    'phone',
    'random'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.event_photo_field_enum as enum (
    'full_body_photo',
    'face_photo',
    'front_photo',
    'profile_photo',
    'diagonal_left_photo',
    'diagonal_right_photo'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.victory_method_enum as enum (
    'decisao',
    'finalizacao',
    'nocaute'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.fantasy_entry_status_enum as enum (
    'submitted',
    'voided',
    'disqualified'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type app.fighter_intake_status_enum as enum (
    'submitted',
    'under_review',
    'approved',
    'changes_requested',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

create or replace function app.normalize_email_text(p_value text)
returns text
language sql
immutable
as $$
  select nullif(lower(btrim(coalesce(p_value, ''))), '');
$$;

create or replace function app.digits_only(p_value text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(p_value, ''), '\D+', '', 'g');
$$;

create or replace function app.last_four_digits(p_value text)
returns text
language sql
immutable
as $$
  select right(app.digits_only(p_value), 4);
$$;

create or replace function app.current_db_has_role(p_role_name text)
returns boolean
language sql
stable
as $$
  select pg_has_role(current_user, p_role_name, 'member');
$$;

create or replace function app.is_public_api_role()
returns boolean
language sql
stable
as $$
  select app.current_db_has_role('mmmma_public_api');
$$;

create or replace function app.is_backoffice_role()
returns boolean
language sql
stable
as $$
  select app.current_db_has_role('mmmma_backoffice');
$$;

create or replace function app.is_fighter_portal_role()
returns boolean
language sql
stable
as $$
  select app.current_db_has_role('mmmma_fighter_portal');
$$;

create or replace function app.is_auditor_role()
returns boolean
language sql
stable
as $$
  select app.current_db_has_role('mmmma_auditor');
$$;

create or replace function app.is_service_role()
returns boolean
language sql
stable
as $$
  select app.current_db_has_role('mmmma_service');
$$;

create or replace function app.is_internal_read_role()
returns boolean
language sql
stable
as $$
  select
    (select app.is_backoffice_role())
    or (select app.is_auditor_role())
    or (select app.is_service_role());
$$;

create or replace function app.is_internal_write_role()
returns boolean
language sql
stable
as $$
  select
    (select app.is_backoffice_role())
    or (select app.is_service_role());
$$;

create or replace function app.current_actor_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.actor_id', true), '')::uuid;
$$;

create or replace function app.current_actor_role()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.actor_role', true), '');
$$;

create or replace function app.current_actor_email()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.actor_email', true), '');
$$;

create or replace function app.current_fantasy_entry_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.fantasy_entry_id', true), '')::uuid;
$$;

create or replace function app.current_request_id()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.request_id', true), '');
$$;

create or replace function app.current_client_ip()
returns inet
language sql
stable
as $$
  select nullif(current_setting('app.client_ip', true), '')::inet;
$$;

create or replace function app.current_origin()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.origin', true), '');
$$;

create or replace function app.current_user_agent()
returns text
language sql
stable
as $$
  select nullif(current_setting('app.user_agent', true), '');
$$;

create or replace function app.set_request_context(
  p_actor_id uuid default null,
  p_actor_role text default null,
  p_actor_email text default null,
  p_fantasy_entry_id uuid default null,
  p_request_id text default null,
  p_client_ip inet default null,
  p_origin text default null,
  p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
begin
  perform set_config('app.actor_id', coalesce(p_actor_id::text, ''), true);
  perform set_config('app.actor_role', coalesce(nullif(btrim(p_actor_role), ''), ''), true);
  perform set_config('app.actor_email', coalesce(app.normalize_email_text(p_actor_email), ''), true);
  perform set_config('app.fantasy_entry_id', coalesce(p_fantasy_entry_id::text, ''), true);
  perform set_config('app.request_id', coalesce(nullif(btrim(p_request_id), ''), ''), true);
  perform set_config('app.client_ip', coalesce(p_client_ip::text, ''), true);
  perform set_config('app.origin', coalesce(nullif(btrim(p_origin), ''), ''), true);
  perform set_config('app.user_agent', coalesce(left(coalesce(p_user_agent, ''), 1000), ''), true);
end;
$$;

create or replace function app.clear_request_context()
returns void
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
begin
  perform set_config('app.actor_id', '', true);
  perform set_config('app.actor_role', '', true);
  perform set_config('app.actor_email', '', true);
  perform set_config('app.fantasy_entry_id', '', true);
  perform set_config('app.request_id', '', true);
  perform set_config('app.client_ip', '', true);
  perform set_config('app.origin', '', true);
  perform set_config('app.user_agent', '', true);
end;
$$;

create or replace function app.require_encryption_key()
returns text
language plpgsql
stable
as $$
declare
  v_key text;
begin
  v_key := nullif(current_setting('app.encryption_key', true), '');

  if v_key is null then
    raise exception 'app.encryption_key is required for this operation';
  end if;

  return v_key;
end;
$$;

create or replace function app.secret_digest(p_value text)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(p_value, ''), 'sha256'), 'hex');
$$;

create or replace function app.encrypt_secret(p_value text)
returns bytea
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select
    case
      when p_value is null or btrim(p_value) = '' then null
      else pgp_sym_encrypt(p_value, app.require_encryption_key(), 'cipher-algo=aes256, compress-algo=1')
    end;
$$;

create or replace function app.decrypt_secret(p_value bytea)
returns text
language sql
stable
security definer
set search_path = pg_catalog, app
as $$
  select
    case
      when p_value is null then null
      else pgp_sym_decrypt(p_value, app.require_encryption_key())
    end;
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function app.normalize_email_column()
returns trigger
language plpgsql
as $$
begin
  new.email := app.normalize_email_text(new.email);
  return new;
end;
$$;

create or replace function app.normalize_slug_column()
returns trigger
language plpgsql
as $$
begin
  new.slug := lower(btrim(new.slug));
  return new;
end;
$$;

create table if not exists app.brazilian_states (
  code char(2) primary key,
  name text not null unique
);

insert into app.brazilian_states (code, name)
values
  ('AC', 'Acre'),
  ('AL', 'Alagoas'),
  ('AP', 'Amapa'),
  ('AM', 'Amazonas'),
  ('BA', 'Bahia'),
  ('CE', 'Ceara'),
  ('DF', 'Distrito Federal'),
  ('ES', 'Espirito Santo'),
  ('GO', 'Goias'),
  ('MA', 'Maranhao'),
  ('MT', 'Mato Grosso'),
  ('MS', 'Mato Grosso do Sul'),
  ('MG', 'Minas Gerais'),
  ('PA', 'Para'),
  ('PB', 'Paraiba'),
  ('PR', 'Parana'),
  ('PE', 'Pernambuco'),
  ('PI', 'Piaui'),
  ('RJ', 'Rio de Janeiro'),
  ('RN', 'Rio Grande do Norte'),
  ('RS', 'Rio Grande do Sul'),
  ('RO', 'Rondonia'),
  ('RR', 'Roraima'),
  ('SC', 'Santa Catarina'),
  ('SP', 'Sao Paulo'),
  ('SE', 'Sergipe'),
  ('TO', 'Tocantins')
on conflict (code) do update
set name = excluded.name;

create table if not exists app.accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  role app.account_role_enum not null,
  status app.account_status_enum not null default 'invited',
  password_hash text,
  last_login_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by_account_id uuid references app.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = app.normalize_email_text(email)),
  check (char_length(email) between 6 and 160),
  check (char_length(display_name) between 2 and 160)
);

create table if not exists app.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts (id) on delete cascade,
  session_kind app.auth_session_kind_enum not null,
  token_hash text not null unique,
  request_id text,
  created_ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  check (token_hash ~ '^[0-9a-f]{64}$'),
  check (expires_at > created_at)
);

create table if not exists app.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null,
  status app.newsletter_status_enum not null default 'subscribed',
  request_id text,
  request_origin text,
  request_ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  check (email = app.normalize_email_text(email)),
  check (char_length(email) between 6 and 160),
  check (request_ip_hash is null or request_ip_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists app.fighter_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  nickname text not null,
  birth_date date not null,
  city text not null,
  team text not null,
  tapology_profile text not null,
  instagram_profile text not null,
  specialty app.fighter_specialty_enum not null,
  specialty_other text,
  competition_history text not null,
  martial_arts_titles text not null,
  curiosities text not null,
  roast_consent boolean not null,
  source text not null,
  status app.application_status_enum not null default 'pending',
  assigned_account_id uuid references app.accounts (id) on delete set null,
  reviewer_notes text,
  request_id text,
  request_origin text,
  request_ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(full_name) between 5 and 160),
  check (char_length(nickname) between 2 and 160),
  check (char_length(city) between 3 and 160),
  check (char_length(team) between 2 and 160),
  check (char_length(tapology_profile) between 3 and 220),
  check (char_length(instagram_profile) between 3 and 220),
  check (specialty <> 'other' or specialty_other is not null),
  check (request_ip_hash is null or request_ip_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists app.partner_inquiries (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  company_name text not null,
  role_title text not null,
  email text not null,
  phone text not null,
  company_profile text,
  partnership_intent text not null default '',
  source text not null,
  status app.partner_inquiry_status_enum not null default 'new',
  assigned_account_id uuid references app.accounts (id) on delete set null,
  last_contacted_at timestamptz,
  reviewer_notes text,
  request_id text,
  request_origin text,
  request_ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = app.normalize_email_text(email)),
  check (char_length(full_name) between 3 and 160),
  check (char_length(company_name) between 2 and 160),
  check (char_length(role_title) between 2 and 160),
  check (char_length(email) between 6 and 160),
  check (char_length(phone) between 8 and 40),
  check (company_profile is null or char_length(company_profile) <= 220),
  check (char_length(partnership_intent) <= 600),
  check (request_ip_hash is null or request_ip_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists app.fantasy_scoring_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  winner_points smallint not null default 10,
  method_points smallint not null default 6,
  round_points smallint not null default 4,
  perfect_pick_bonus smallint not null default 3,
  is_default boolean not null default false,
  created_by_account_id uuid references app.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (winner_points >= 0),
  check (method_points >= 0),
  check (round_points >= 0),
  check (perfect_pick_bonus >= 0)
);

create unique index if not exists fantasy_scoring_profiles_one_default_idx
  on app.fantasy_scoring_profiles (is_default)
  where is_default;

create table if not exists app.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status app.event_status_enum not null default 'draft',
  starts_at timestamptz not null,
  lock_at timestamptz not null,
  venue_name text not null,
  city_name text not null,
  state_code char(2) references app.brazilian_states (code),
  country_code char(2) not null default 'BR',
  hero_label text not null default 'Fantasy oficial do card',
  broadcast_label text not null default 'Canal Money Moicano',
  status_text text not null default '',
  published_at timestamptz,
  finished_at timestamptz,
  scoring_profile_id uuid not null references app.fantasy_scoring_profiles (id) on delete restrict,
  created_by_account_id uuid references app.accounts (id) on delete set null,
  updated_by_account_id uuid references app.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug = lower(btrim(slug))),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (char_length(name) between 3 and 180),
  check (char_length(venue_name) between 2 and 180),
  check (char_length(city_name) between 2 and 160),
  check (lock_at <= starts_at),
  check (country_code ~ '^[A-Z]{2}$')
);

create table if not exists app.fighters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  legal_name text,
  nickname text,
  country_name text not null default 'Brasil',
  country_code char(2),
  image_url text,
  instagram_handle text,
  tapology_profile text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug = lower(btrim(slug))),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check (char_length(display_name) between 2 and 180),
  check (country_code is null or country_code ~ '^[A-Z]{2}$')
);

create table if not exists app.event_fighters (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references app.events (id) on delete cascade,
  fighter_id uuid not null references app.fighters (id) on delete restrict,
  portal_account_id uuid references app.accounts (id) on delete set null,
  card_name text,
  intake_deadline timestamptz,
  intake_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, fighter_id)
);

create unique index if not exists event_fighters_event_portal_account_uidx
  on app.event_fighters (event_id, portal_account_id)
  where portal_account_id is not null;

create table if not exists app.fights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references app.events (id) on delete cascade,
  display_order integer not null,
  label text not null,
  max_rounds smallint not null,
  red_corner_event_fighter_id uuid not null references app.event_fighters (id) on delete restrict,
  blue_corner_event_fighter_id uuid not null references app.event_fighters (id) on delete restrict,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, display_order),
  check (display_order > 0),
  check (max_rounds in (3, 5)),
  check (red_corner_event_fighter_id <> blue_corner_event_fighter_id)
);

create table if not exists app.fight_results (
  id uuid primary key default gen_random_uuid(),
  fight_id uuid not null unique references app.fights (id) on delete cascade,
  winner_event_fighter_id uuid not null references app.event_fighters (id) on delete restrict,
  victory_method app.victory_method_enum not null,
  official_round smallint not null,
  notes text,
  decided_by_account_id uuid references app.accounts (id) on delete set null,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (official_round between 1 and 5)
);

create table if not exists app.fantasy_entries (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  event_id uuid not null references app.events (id) on delete cascade,
  display_name text not null,
  full_name text not null,
  email text not null,
  whatsapp text not null,
  city text not null,
  state_code char(2) not null references app.brazilian_states (code),
  marketing_consent boolean not null,
  source text not null,
  entry_status app.fantasy_entry_status_enum not null default 'submitted',
  score_cached integer not null default 0,
  perfect_picks_cached integer not null default 0,
  request_id text,
  request_origin text,
  request_ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = app.normalize_email_text(email)),
  check (char_length(full_name) between 3 and 160),
  check (char_length(email) between 6 and 160),
  check (char_length(whatsapp) between 10 and 40),
  check (char_length(city) between 2 and 160),
  check (marketing_consent),
  check (score_cached >= 0),
  check (perfect_picks_cached >= 0),
  check (request_ip_hash is null or request_ip_hash ~ '^[0-9a-f]{64}$')
);

create unique index if not exists fantasy_entries_event_email_uidx
  on app.fantasy_entries (event_id, email);

create table if not exists app.fantasy_entry_access_tokens (
  id uuid primary key default gen_random_uuid(),
  fantasy_entry_id uuid not null references app.fantasy_entries (id) on delete cascade,
  token_hash text not null unique,
  issued_ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  check (token_hash ~ '^[0-9a-f]{64}$'),
  check (issued_ip_hash is null or issued_ip_hash ~ '^[0-9a-f]{64}$'),
  check (expires_at is null or expires_at > issued_at)
);

create table if not exists app.fantasy_picks (
  id uuid primary key default gen_random_uuid(),
  fantasy_entry_id uuid not null references app.fantasy_entries (id) on delete cascade,
  fight_id uuid not null references app.fights (id) on delete cascade,
  picked_event_fighter_id uuid not null references app.event_fighters (id) on delete restrict,
  predicted_victory_method app.victory_method_enum not null,
  predicted_round smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fantasy_entry_id, fight_id),
  check (predicted_round between 1 and 5)
);

create table if not exists app.event_fighter_intakes (
  id uuid primary key default gen_random_uuid(),
  event_fighter_id uuid not null unique references app.event_fighters (id) on delete cascade,
  submitted_by_account_id uuid references app.accounts (id) on delete set null,
  full_name text not null,
  nickname text not null,
  email text not null,
  phone_whatsapp text not null,
  birth_date date not null,
  cpf_ciphertext bytea not null,
  cpf_digest text not null,
  cpf_last4 text not null,
  pix_key_type app.pix_key_type_enum not null,
  pix_key_ciphertext bytea not null,
  pix_key_digest text not null,
  pix_key_last4 text not null,
  has_health_insurance boolean not null,
  health_insurance_provider text,
  record_summary text not null,
  primary_specialty text not null,
  additional_specialties text not null,
  competition_history text not null,
  titles_won text not null,
  life_story text not null,
  funny_story text not null,
  curiosities text not null,
  hobbies text not null,
  source text not null,
  intake_status app.fighter_intake_status_enum not null default 'submitted',
  reviewed_by_account_id uuid references app.accounts (id) on delete set null,
  reviewed_at timestamptz,
  staff_notes text,
  request_id text,
  request_origin text,
  request_ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = app.normalize_email_text(email)),
  check (char_length(full_name) between 5 and 180),
  check (char_length(nickname) between 2 and 180),
  check (char_length(email) between 6 and 160),
  check (char_length(phone_whatsapp) between 8 and 40),
  check (cpf_digest ~ '^[0-9a-f]{64}$'),
  check (cpf_last4 ~ '^\d{4}$'),
  check (pix_key_digest ~ '^[0-9a-f]{64}$'),
  check (pix_key_last4 ~ '^\d{0,4}$'),
  check (
    (has_health_insurance and health_insurance_provider is not null and char_length(health_insurance_provider) >= 2)
    or (not has_health_insurance and health_insurance_provider is null)
  ),
  check (request_ip_hash is null or request_ip_hash ~ '^[0-9a-f]{64}$')
);

create table if not exists app.event_fighter_intake_photos (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references app.event_fighter_intakes (id) on delete cascade,
  field_name app.event_photo_field_enum not null,
  storage_provider text not null default 'r2',
  storage_bucket text not null,
  object_key text not null,
  original_file_name text,
  content_type text not null,
  byte_size bigint not null,
  sha256_hex text not null,
  width_px integer,
  height_px integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intake_id, field_name),
  check (byte_size > 0 and byte_size <= 10485760),
  check (sha256_hex ~ '^[0-9a-f]{64}$'),
  check (width_px is null or width_px > 0),
  check (height_px is null or height_px > 0)
);

create index if not exists auth_sessions_account_id_idx
  on app.auth_sessions (account_id);

create index if not exists newsletter_subscriptions_status_idx
  on app.newsletter_subscriptions (status, subscribed_at desc);

create index if not exists fighter_applications_status_idx
  on app.fighter_applications (status, created_at desc);

create index if not exists fighter_applications_assigned_account_id_idx
  on app.fighter_applications (assigned_account_id);

create index if not exists partner_inquiries_status_idx
  on app.partner_inquiries (status, created_at desc);

create index if not exists partner_inquiries_assigned_account_id_idx
  on app.partner_inquiries (assigned_account_id);

create index if not exists events_status_lock_at_idx
  on app.events (status, lock_at);

create index if not exists event_fighters_event_id_idx
  on app.event_fighters (event_id);

create index if not exists event_fighters_fighter_id_idx
  on app.event_fighters (fighter_id);

create index if not exists event_fighters_portal_account_id_idx
  on app.event_fighters (portal_account_id);

create index if not exists fights_event_id_idx
  on app.fights (event_id);

create index if not exists fight_results_winner_event_fighter_id_idx
  on app.fight_results (winner_event_fighter_id);

create index if not exists fantasy_entries_event_rank_idx
  on app.fantasy_entries (event_id, score_cached desc, submitted_at asc);

create index if not exists fantasy_entry_access_tokens_entry_id_idx
  on app.fantasy_entry_access_tokens (fantasy_entry_id);

create index if not exists fantasy_picks_fantasy_entry_id_idx
  on app.fantasy_picks (fantasy_entry_id);

create index if not exists fantasy_picks_fight_id_idx
  on app.fantasy_picks (fight_id);

create index if not exists fantasy_picks_picked_event_fighter_id_idx
  on app.fantasy_picks (picked_event_fighter_id);

create index if not exists event_fighter_intakes_event_fighter_id_idx
  on app.event_fighter_intakes (event_fighter_id);

create index if not exists event_fighter_intakes_submitted_by_account_id_idx
  on app.event_fighter_intakes (submitted_by_account_id);

create index if not exists event_fighter_intakes_reviewed_by_account_id_idx
  on app.event_fighter_intakes (reviewed_by_account_id);

create index if not exists event_fighter_intake_photos_intake_id_idx
  on app.event_fighter_intake_photos (intake_id);

create or replace function app.is_public_event_status(p_status app.event_status_enum)
returns boolean
language sql
immutable
as $$
  select p_status in ('published', 'locked', 'finished');
$$;

create or replace function app.build_public_display_name(p_full_name text)
returns text
language plpgsql
immutable
as $$
declare
  v_parts text[];
  v_first_name text;
  v_last_initial text;
begin
  v_parts := regexp_split_to_array(trim(regexp_replace(coalesce(p_full_name, ''), '\s+', ' ', 'g')), '\s+');
  v_first_name := coalesce(v_parts[1], 'Participante');
  v_last_initial := null;

  if coalesce(array_length(v_parts, 1), 0) >= 2 then
    v_last_initial := upper(left(v_parts[array_length(v_parts, 1)], 1));
  end if;

  if v_last_initial is null or v_last_initial = '' then
    return v_first_name;
  end if;

  return v_first_name || ' ' || v_last_initial || '.';
end;
$$;

create or replace function app.generate_reference_code(p_prefix text default 'FAN')
returns text
language plpgsql
volatile
set search_path = pg_catalog, app
as $$
declare
  v_prefix text;
  v_candidate text;
begin
  v_prefix := upper(left(regexp_replace(coalesce(p_prefix, 'FAN'), '[^A-Za-z0-9]', '', 'g'), 3));

  if v_prefix = '' then
    v_prefix := 'FAN';
  end if;

  loop
    v_candidate := v_prefix || '-' || upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists (
      select 1
      from app.fantasy_entries
      where reference_code = v_candidate
    );
  end loop;

  return v_candidate;
end;
$$;

create or replace function app.prepare_fantasy_entry()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
begin
  new.email := app.normalize_email_text(new.email);
  new.display_name := app.build_public_display_name(new.full_name);

  if new.reference_code is null or btrim(new.reference_code) = '' then
    new.reference_code := app.generate_reference_code('FAN');
  end if;

  return new;
end;
$$;

create or replace function app.ensure_event_fighter_portal_account()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
declare
  v_role app.account_role_enum;
begin
  if new.portal_account_id is null then
    return new;
  end if;

  select role
  into v_role
  from app.accounts
  where id = new.portal_account_id;

  if v_role is distinct from 'fighter' then
    raise exception 'portal_account_id must reference an account with role fighter';
  end if;

  return new;
end;
$$;

create or replace function app.ensure_fight_corners_match_event()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
begin
  if not exists (
    select 1
    from app.event_fighters
    where id = new.red_corner_event_fighter_id
      and event_id = new.event_id
  ) then
    raise exception 'red corner fighter must belong to the same event';
  end if;

  if not exists (
    select 1
    from app.event_fighters
    where id = new.blue_corner_event_fighter_id
      and event_id = new.event_id
  ) then
    raise exception 'blue corner fighter must belong to the same event';
  end if;

  return new;
end;
$$;

create or replace function app.ensure_fight_result_matches_fight()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
declare
  v_fight app.fights%rowtype;
begin
  select *
  into v_fight
  from app.fights
  where id = new.fight_id;

  if not found then
    raise exception 'fight not found for result';
  end if;

  if new.winner_event_fighter_id not in (v_fight.red_corner_event_fighter_id, v_fight.blue_corner_event_fighter_id) then
    raise exception 'winner_event_fighter_id must match one of the fight corners';
  end if;

  if new.official_round > v_fight.max_rounds then
    raise exception 'official_round exceeds max_rounds for the fight';
  end if;

  return new;
end;
$$;

create or replace function app.ensure_fantasy_pick_matches_fight()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
declare
  v_entry_event_id uuid;
  v_fight app.fights%rowtype;
begin
  select event_id
  into v_entry_event_id
  from app.fantasy_entries
  where id = new.fantasy_entry_id;

  if not found then
    raise exception 'fantasy entry not found for pick';
  end if;

  select *
  into v_fight
  from app.fights
  where id = new.fight_id;

  if not found then
    raise exception 'fight not found for pick';
  end if;

  if v_entry_event_id <> v_fight.event_id then
    raise exception 'pick fight must belong to the same event as the entry';
  end if;

  if new.picked_event_fighter_id not in (v_fight.red_corner_event_fighter_id, v_fight.blue_corner_event_fighter_id) then
    raise exception 'picked_event_fighter_id must match one of the fight corners';
  end if;

  if new.predicted_round > v_fight.max_rounds then
    raise exception 'predicted_round exceeds max_rounds for the fight';
  end if;

  return new;
end;
$$;

create or replace function app.prepare_event_fighter_intake()
returns trigger
language plpgsql
set search_path = pg_catalog, app
as $$
declare
  v_portal_account_id uuid;
begin
  new.email := app.normalize_email_text(new.email);

  if new.submitted_by_account_id is null then
    new.submitted_by_account_id := app.current_actor_id();
  end if;

  select portal_account_id
  into v_portal_account_id
  from app.event_fighters
  where id = new.event_fighter_id;

  if v_portal_account_id is null and not app.is_internal_write_role() then
    raise exception 'event fighter requires a portal account before intake submission';
  end if;

  if not app.is_internal_write_role() and new.submitted_by_account_id is distinct from v_portal_account_id then
    raise exception 'submitted_by_account_id must match the assigned portal account';
  end if;

  return new;
end;
$$;

create or replace function app.refresh_fantasy_entry_scores(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
begin
  with score_rollup as (
    select
      fe.id as fantasy_entry_id,
      coalesce(sum(
        (case when fr.winner_event_fighter_id is not null and fp.picked_event_fighter_id = fr.winner_event_fighter_id then sp.winner_points else 0 end) +
        (case when fr.victory_method is not null and fp.predicted_victory_method = fr.victory_method then sp.method_points else 0 end) +
        (case when fr.official_round is not null and fp.predicted_round = fr.official_round then sp.round_points else 0 end) +
        (
          case
            when fr.winner_event_fighter_id is not null
              and fr.victory_method is not null
              and fr.official_round is not null
              and fp.picked_event_fighter_id = fr.winner_event_fighter_id
              and fp.predicted_victory_method = fr.victory_method
              and fp.predicted_round = fr.official_round
            then sp.perfect_pick_bonus
            else 0
          end
        )
      ), 0)::integer as total_score,
      coalesce(sum(
        case
          when fr.winner_event_fighter_id is not null
            and fr.victory_method is not null
            and fr.official_round is not null
            and fp.picked_event_fighter_id = fr.winner_event_fighter_id
            and fp.predicted_victory_method = fr.victory_method
            and fp.predicted_round = fr.official_round
          then 1
          else 0
        end
      ), 0)::integer as perfect_picks
    from app.fantasy_entries fe
    join app.events e
      on e.id = fe.event_id
    join app.fantasy_scoring_profiles sp
      on sp.id = e.scoring_profile_id
    left join app.fantasy_picks fp
      on fp.fantasy_entry_id = fe.id
    left join app.fight_results fr
      on fr.fight_id = fp.fight_id
    where fe.event_id = p_event_id
    group by fe.id
  )
  update app.fantasy_entries fe
  set
    score_cached = sr.total_score,
    perfect_picks_cached = sr.perfect_picks,
    updated_at = now()
  from score_rollup sr
  where sr.fantasy_entry_id = fe.id;
end;
$$;

create or replace function app.refresh_scores_from_pick_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
declare
  v_event_id uuid;
begin
  select event_id
  into v_event_id
  from app.fantasy_entries
  where id = coalesce(new.fantasy_entry_id, old.fantasy_entry_id);

  if v_event_id is not null then
    perform app.refresh_fantasy_entry_scores(v_event_id);
  end if;

  return null;
end;
$$;

create or replace function app.refresh_scores_from_result_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
declare
  v_event_id uuid;
begin
  select event_id
  into v_event_id
  from app.fights
  where id = coalesce(new.fight_id, old.fight_id);

  if v_event_id is not null then
    perform app.refresh_fantasy_entry_scores(v_event_id);
  end if;

  return null;
end;
$$;

create table if not exists audit.logged_actions (
  id bigserial primary key,
  schema_name text not null,
  table_name text not null,
  relid oid not null,
  action text not null,
  row_pk jsonb,
  changed_columns text[] not null default array[]::text[],
  old_row jsonb,
  new_row jsonb,
  actor_id uuid,
  actor_role text,
  actor_email text,
  request_id text,
  client_ip inet,
  origin text,
  user_agent text,
  transaction_id bigint not null default txid_current(),
  changed_at timestamptz not null default now(),
  check (action in ('I', 'U', 'D'))
);

create index if not exists audit_logged_actions_table_idx
  on audit.logged_actions (schema_name, table_name, changed_at desc);

create index if not exists audit_logged_actions_actor_idx
  on audit.logged_actions (actor_id, changed_at desc);

create index if not exists audit_logged_actions_request_idx
  on audit.logged_actions (request_id);

create or replace function audit.changed_keys(p_old jsonb, p_new jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(key order by key), array[]::text[])
  from jsonb_object_keys(coalesce(p_old, '{}'::jsonb) || coalesce(p_new, '{}'::jsonb)) as keys(key)
  where coalesce(p_old -> key, 'null'::jsonb) is distinct from coalesce(p_new -> key, 'null'::jsonb);
$$;

create or replace function audit.sanitize_row(p_row jsonb, p_redacted_columns text[])
returns jsonb
language sql
immutable
as $$
  select
    case
      when p_row is null then null
      else p_row - coalesce(p_redacted_columns, array[]::text[])
    end;
$$;

create or replace function audit.log_row_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, app, audit
as $$
declare
  v_redacted_columns text[] := coalesce(tg_argv, array[]::text[]);
  v_old_row jsonb;
  v_new_row jsonb;
  v_row_pk jsonb;
begin
  if tg_op = 'INSERT' then
    v_new_row := audit.sanitize_row(to_jsonb(new), v_redacted_columns);
    v_row_pk := jsonb_build_object('id', to_jsonb(new) -> 'id');
  elsif tg_op = 'UPDATE' then
    v_old_row := audit.sanitize_row(to_jsonb(old), v_redacted_columns);
    v_new_row := audit.sanitize_row(to_jsonb(new), v_redacted_columns);
    v_row_pk := jsonb_build_object('id', coalesce(to_jsonb(new) -> 'id', to_jsonb(old) -> 'id'));
  elsif tg_op = 'DELETE' then
    v_old_row := audit.sanitize_row(to_jsonb(old), v_redacted_columns);
    v_row_pk := jsonb_build_object('id', to_jsonb(old) -> 'id');
  else
    raise exception 'unsupported operation for audit trigger: %', tg_op;
  end if;

  insert into audit.logged_actions (
    schema_name,
    table_name,
    relid,
    action,
    row_pk,
    changed_columns,
    old_row,
    new_row,
    actor_id,
    actor_role,
    actor_email,
    request_id,
    client_ip,
    origin,
    user_agent
  )
  values (
    tg_table_schema,
    tg_table_name,
    tg_relid,
    substr(tg_op, 1, 1),
    v_row_pk,
    audit.changed_keys(v_old_row, v_new_row),
    v_old_row,
    v_new_row,
    app.current_actor_id(),
    app.current_actor_role(),
    app.current_actor_email(),
    app.current_request_id(),
    app.current_client_ip(),
    app.current_origin(),
    app.current_user_agent()
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger accounts_touch_updated_at
before update on app.accounts
for each row
execute function app.touch_updated_at();

create trigger accounts_normalize_email
before insert or update on app.accounts
for each row
execute function app.normalize_email_column();

create trigger newsletter_subscriptions_touch_updated_at
before update on app.newsletter_subscriptions
for each row
execute function app.touch_updated_at();

create trigger newsletter_subscriptions_normalize_email
before insert or update on app.newsletter_subscriptions
for each row
execute function app.normalize_email_column();

create trigger fighter_applications_touch_updated_at
before update on app.fighter_applications
for each row
execute function app.touch_updated_at();

create trigger partner_inquiries_touch_updated_at
before update on app.partner_inquiries
for each row
execute function app.touch_updated_at();

create trigger partner_inquiries_normalize_email
before insert or update on app.partner_inquiries
for each row
execute function app.normalize_email_column();

create trigger fantasy_scoring_profiles_touch_updated_at
before update on app.fantasy_scoring_profiles
for each row
execute function app.touch_updated_at();

create trigger events_touch_updated_at
before update on app.events
for each row
execute function app.touch_updated_at();

create trigger events_normalize_slug
before insert or update on app.events
for each row
execute function app.normalize_slug_column();

create trigger fighters_touch_updated_at
before update on app.fighters
for each row
execute function app.touch_updated_at();

create trigger fighters_normalize_slug
before insert or update on app.fighters
for each row
execute function app.normalize_slug_column();

create trigger event_fighters_touch_updated_at
before update on app.event_fighters
for each row
execute function app.touch_updated_at();

create trigger event_fighters_validate_portal_account
before insert or update on app.event_fighters
for each row
execute function app.ensure_event_fighter_portal_account();

create trigger fights_touch_updated_at
before update on app.fights
for each row
execute function app.touch_updated_at();

create trigger fights_validate_corners
before insert or update on app.fights
for each row
execute function app.ensure_fight_corners_match_event();

create trigger fight_results_touch_updated_at
before update on app.fight_results
for each row
execute function app.touch_updated_at();

create trigger fight_results_validate_fight
before insert or update on app.fight_results
for each row
execute function app.ensure_fight_result_matches_fight();

create trigger fantasy_entries_touch_updated_at
before update on app.fantasy_entries
for each row
execute function app.touch_updated_at();

create trigger fantasy_entries_prepare
before insert or update on app.fantasy_entries
for each row
execute function app.prepare_fantasy_entry();

create trigger fantasy_picks_touch_updated_at
before update on app.fantasy_picks
for each row
execute function app.touch_updated_at();

create trigger fantasy_picks_validate_pick
before insert or update on app.fantasy_picks
for each row
execute function app.ensure_fantasy_pick_matches_fight();

create trigger event_fighter_intakes_touch_updated_at
before update on app.event_fighter_intakes
for each row
execute function app.touch_updated_at();

create trigger event_fighter_intakes_prepare
before insert or update on app.event_fighter_intakes
for each row
execute function app.prepare_event_fighter_intake();

create trigger event_fighter_intake_photos_touch_updated_at
before update on app.event_fighter_intake_photos
for each row
execute function app.touch_updated_at();

create trigger fantasy_picks_refresh_scores
after insert or update or delete on app.fantasy_picks
for each row
execute function app.refresh_scores_from_pick_change();

create trigger fight_results_refresh_scores
after insert or update or delete on app.fight_results
for each row
execute function app.refresh_scores_from_result_change();

create trigger accounts_audit
after insert or update or delete on app.accounts
for each row
execute function audit.log_row_change('password_hash');

create trigger auth_sessions_audit
after insert or update or delete on app.auth_sessions
for each row
execute function audit.log_row_change('token_hash');

create trigger newsletter_subscriptions_audit
after insert or update or delete on app.newsletter_subscriptions
for each row
execute function audit.log_row_change('email', 'request_ip_hash', 'user_agent');

create trigger fighter_applications_audit
after insert or update or delete on app.fighter_applications
for each row
execute function audit.log_row_change('request_ip_hash', 'user_agent');

create trigger partner_inquiries_audit
after insert or update or delete on app.partner_inquiries
for each row
execute function audit.log_row_change('email', 'phone', 'request_ip_hash', 'user_agent');

create trigger fantasy_scoring_profiles_audit
after insert or update or delete on app.fantasy_scoring_profiles
for each row
execute function audit.log_row_change();

create trigger events_audit
after insert or update or delete on app.events
for each row
execute function audit.log_row_change();

create trigger fighters_audit
after insert or update or delete on app.fighters
for each row
execute function audit.log_row_change();

create trigger event_fighters_audit
after insert or update or delete on app.event_fighters
for each row
execute function audit.log_row_change('portal_account_id');

create trigger fights_audit
after insert or update or delete on app.fights
for each row
execute function audit.log_row_change();

create trigger fight_results_audit
after insert or update or delete on app.fight_results
for each row
execute function audit.log_row_change();

create trigger fantasy_entries_audit
after insert or update or delete on app.fantasy_entries
for each row
execute function audit.log_row_change('full_name', 'email', 'whatsapp', 'city', 'request_ip_hash', 'user_agent');

create trigger fantasy_entry_access_tokens_audit
after insert or update or delete on app.fantasy_entry_access_tokens
for each row
execute function audit.log_row_change('token_hash', 'issued_ip_hash');

create trigger fantasy_picks_audit
after insert or update or delete on app.fantasy_picks
for each row
execute function audit.log_row_change();

create trigger event_fighter_intakes_audit
after insert or update or delete on app.event_fighter_intakes
for each row
execute function audit.log_row_change(
  'email',
  'phone_whatsapp',
  'cpf_ciphertext',
  'cpf_digest',
  'pix_key_ciphertext',
  'pix_key_digest',
  'request_ip_hash',
  'user_agent'
);

create trigger event_fighter_intake_photos_audit
after insert or update or delete on app.event_fighter_intake_photos
for each row
execute function audit.log_row_change();

alter table app.accounts enable row level security;
alter table app.accounts force row level security;
alter table app.auth_sessions enable row level security;
alter table app.auth_sessions force row level security;
alter table app.newsletter_subscriptions enable row level security;
alter table app.newsletter_subscriptions force row level security;
alter table app.fighter_applications enable row level security;
alter table app.fighter_applications force row level security;
alter table app.partner_inquiries enable row level security;
alter table app.partner_inquiries force row level security;
alter table app.fantasy_scoring_profiles enable row level security;
alter table app.fantasy_scoring_profiles force row level security;
alter table app.events enable row level security;
alter table app.events force row level security;
alter table app.fighters enable row level security;
alter table app.fighters force row level security;
alter table app.event_fighters enable row level security;
alter table app.event_fighters force row level security;
alter table app.fights enable row level security;
alter table app.fights force row level security;
alter table app.fight_results enable row level security;
alter table app.fight_results force row level security;
alter table app.fantasy_entries enable row level security;
alter table app.fantasy_entries force row level security;
alter table app.fantasy_entry_access_tokens enable row level security;
alter table app.fantasy_entry_access_tokens force row level security;
alter table app.fantasy_picks enable row level security;
alter table app.fantasy_picks force row level security;
alter table app.event_fighter_intakes enable row level security;
alter table app.event_fighter_intakes force row level security;
alter table app.event_fighter_intake_photos enable row level security;
alter table app.event_fighter_intake_photos force row level security;

create policy accounts_internal_read_policy
on app.accounts
for select
using (
  (select app.is_internal_read_role())
  or id = (select app.current_actor_id())
);

create policy accounts_internal_write_policy
on app.accounts
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy auth_sessions_read_policy
on app.auth_sessions
for select
using (
  (select app.is_internal_read_role())
  or account_id = (select app.current_actor_id())
);

create policy auth_sessions_write_policy
on app.auth_sessions
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy newsletter_subscriptions_internal_read_policy
on app.newsletter_subscriptions
for select
using ((select app.is_internal_read_role()));

create policy newsletter_subscriptions_public_insert_policy
on app.newsletter_subscriptions
for insert
with check (
  ((select app.is_public_api_role()) or (select app.is_service_role()))
  and status = 'subscribed'
);

create policy newsletter_subscriptions_internal_update_policy
on app.newsletter_subscriptions
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fighter_applications_internal_read_policy
on app.fighter_applications
for select
using ((select app.is_internal_read_role()));

create policy fighter_applications_public_insert_policy
on app.fighter_applications
for insert
with check (
  ((select app.is_public_api_role()) or (select app.is_service_role()))
  and status = 'pending'
);

create policy fighter_applications_internal_update_policy
on app.fighter_applications
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy partner_inquiries_internal_read_policy
on app.partner_inquiries
for select
using ((select app.is_internal_read_role()));

create policy partner_inquiries_public_insert_policy
on app.partner_inquiries
for insert
with check (
  ((select app.is_public_api_role()) or (select app.is_service_role()))
  and status = 'new'
);

create policy partner_inquiries_internal_update_policy
on app.partner_inquiries
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fantasy_scoring_profiles_internal_policy
on app.fantasy_scoring_profiles
for all
using ((select app.is_internal_read_role()))
with check ((select app.is_internal_write_role()));

create policy events_read_policy
on app.events
for select
using (
  (select app.is_internal_read_role())
  or app.is_public_event_status(status)
);

create policy events_write_policy
on app.events
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fighters_read_policy
on app.fighters
for select
using (
  (select app.is_internal_read_role())
  or exists (
    select 1
    from app.event_fighters ef
    join app.events e
      on e.id = ef.event_id
    where ef.fighter_id = fighters.id
      and (
        app.is_public_event_status(e.status)
        or (
          (select app.is_fighter_portal_role())
          and ef.portal_account_id = (select app.current_actor_id())
        )
      )
  )
);

create policy fighters_write_policy
on app.fighters
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy event_fighters_read_policy
on app.event_fighters
for select
using (
  (select app.is_internal_read_role())
  or (
    (select app.is_fighter_portal_role())
    and portal_account_id = (select app.current_actor_id())
  )
  or exists (
    select 1
    from app.events e
    where e.id = event_fighters.event_id
      and app.is_public_event_status(e.status)
  )
);

create policy event_fighters_write_policy
on app.event_fighters
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fights_read_policy
on app.fights
for select
using (
  (select app.is_internal_read_role())
  or exists (
    select 1
    from app.events e
    where e.id = fights.event_id
      and app.is_public_event_status(e.status)
  )
  or exists (
    select 1
    from app.event_fighters ef
    where ef.event_id = fights.event_id
      and ef.portal_account_id = (select app.current_actor_id())
  )
);

create policy fights_write_policy
on app.fights
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fight_results_read_policy
on app.fight_results
for select
using (
  (select app.is_internal_read_role())
  or exists (
    select 1
    from app.fights f
    join app.events e
      on e.id = f.event_id
    where f.id = fight_results.fight_id
      and (
        app.is_public_event_status(e.status)
        or exists (
          select 1
          from app.event_fighters ef
          where ef.event_id = e.id
            and ef.portal_account_id = (select app.current_actor_id())
        )
      )
  )
);

create policy fight_results_write_policy
on app.fight_results
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fantasy_entries_public_rank_read_policy
on app.fantasy_entries
for select
using (
  (select app.is_internal_read_role())
  or id = (select app.current_fantasy_entry_id())
  or exists (
    select 1
    from app.events e
    where e.id = fantasy_entries.event_id
      and app.is_public_event_status(e.status)
  )
);

create policy fantasy_entries_public_insert_policy
on app.fantasy_entries
for insert
with check (
  ((select app.is_public_api_role()) or (select app.is_service_role()))
  and entry_status = 'submitted'
  and exists (
    select 1
    from app.events e
    where e.id = fantasy_entries.event_id
      and e.status = 'published'
      and e.lock_at > now()
  )
);

create policy fantasy_entries_internal_update_policy
on app.fantasy_entries
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fantasy_entry_access_tokens_internal_policy
on app.fantasy_entry_access_tokens
for all
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy fantasy_picks_read_policy
on app.fantasy_picks
for select
using (
  (select app.is_internal_read_role())
  or fantasy_entry_id = (select app.current_fantasy_entry_id())
);

create policy fantasy_picks_insert_policy
on app.fantasy_picks
for insert
with check (
  (
    (select app.is_internal_write_role())
    or (
      ((select app.is_public_api_role()) or (select app.is_service_role()))
      and fantasy_entry_id = (select app.current_fantasy_entry_id())
    )
  )
);

create policy fantasy_picks_update_policy
on app.fantasy_picks
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy event_fighter_intakes_read_policy
on app.event_fighter_intakes
for select
using ((select app.is_internal_read_role()));

create policy event_fighter_intakes_insert_policy
on app.event_fighter_intakes
for insert
with check (
  (select app.is_internal_write_role())
  or (
    (select app.is_fighter_portal_role())
    and exists (
      select 1
      from app.event_fighters ef
      where ef.id = event_fighter_intakes.event_fighter_id
        and ef.portal_account_id = (select app.current_actor_id())
    )
  )
);

create policy event_fighter_intakes_update_policy
on app.event_fighter_intakes
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

create policy event_fighter_intake_photos_read_policy
on app.event_fighter_intake_photos
for select
using ((select app.is_internal_read_role()));

create policy event_fighter_intake_photos_insert_policy
on app.event_fighter_intake_photos
for insert
with check (
  (select app.is_internal_write_role())
  or (
    (select app.is_fighter_portal_role())
    and exists (
      select 1
      from app.event_fighter_intakes i
      join app.event_fighters ef
        on ef.id = i.event_fighter_id
      where i.id = event_fighter_intake_photos.intake_id
        and ef.portal_account_id = (select app.current_actor_id())
    )
  )
);

create policy event_fighter_intake_photos_update_policy
on app.event_fighter_intake_photos
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

revoke all on schema app from public;
revoke all on schema audit from public;
revoke all on all tables in schema app from public;
revoke all on all tables in schema audit from public;
revoke all on all sequences in schema audit from public;

grant usage on schema app to mmmma_public_api;
grant usage on schema app to mmmma_backoffice;
grant usage on schema app to mmmma_fighter_portal;
grant usage on schema app to mmmma_service;
grant usage on schema app to mmmma_auditor;

grant usage on schema audit to mmmma_backoffice;
grant usage on schema audit to mmmma_service;
grant usage on schema audit to mmmma_auditor;

grant execute on function app.current_actor_id() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.current_actor_role() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.current_actor_email() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.current_fantasy_entry_id() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.current_request_id() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.current_client_ip() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.current_origin() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.current_user_agent() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant execute on function app.set_request_context(uuid, text, text, uuid, text, inet, text, text) to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service;
grant execute on function app.clear_request_context() to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service;
grant execute on function app.encrypt_secret(text) to mmmma_backoffice, mmmma_fighter_portal, mmmma_service;
grant execute on function app.decrypt_secret(bytea) to mmmma_backoffice, mmmma_service;
grant execute on function app.secret_digest(text) to mmmma_backoffice, mmmma_fighter_portal, mmmma_service;
grant execute on function app.refresh_fantasy_entry_scores(uuid) to mmmma_backoffice, mmmma_service;

grant select on app.brazilian_states to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;

grant select (id, role, status, email, display_name, last_login_at, metadata, created_by_account_id, created_at, updated_at)
  on app.accounts
  to mmmma_backoffice, mmmma_service;

grant select (id, role, status, email, display_name, last_login_at, metadata, created_by_account_id, created_at, updated_at)
  on app.accounts
  to mmmma_auditor;

grant select (password_hash)
  on app.accounts
  to mmmma_service;

grant insert, update, delete on app.accounts to mmmma_backoffice, mmmma_service;

grant select on app.auth_sessions to mmmma_backoffice, mmmma_service;
grant insert, update, delete on app.auth_sessions to mmmma_backoffice, mmmma_service;

grant insert (email, source, request_id, request_origin, request_ip_hash, user_agent, metadata)
  on app.newsletter_subscriptions
  to mmmma_public_api, mmmma_service;

grant select, update on app.newsletter_subscriptions to mmmma_backoffice, mmmma_service, mmmma_auditor;

grant insert (
  full_name,
  nickname,
  birth_date,
  city,
  team,
  tapology_profile,
  instagram_profile,
  specialty,
  specialty_other,
  competition_history,
  martial_arts_titles,
  curiosities,
  roast_consent,
  source,
  request_id,
  request_origin,
  request_ip_hash,
  user_agent,
  metadata
)
  on app.fighter_applications
  to mmmma_public_api, mmmma_service;

grant select, update on app.fighter_applications to mmmma_backoffice, mmmma_service, mmmma_auditor;

grant insert (
  full_name,
  company_name,
  role_title,
  email,
  phone,
  company_profile,
  partnership_intent,
  source,
  request_id,
  request_origin,
  request_ip_hash,
  user_agent,
  metadata
)
  on app.partner_inquiries
  to mmmma_public_api, mmmma_service;

grant select, update on app.partner_inquiries to mmmma_backoffice, mmmma_service, mmmma_auditor;

grant select on app.fantasy_scoring_profiles to mmmma_backoffice, mmmma_service, mmmma_auditor;
grant insert, update, delete on app.fantasy_scoring_profiles to mmmma_backoffice, mmmma_service;

grant select on app.events to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant insert, update, delete on app.events to mmmma_backoffice, mmmma_service;

grant select on app.fighters to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant insert, update, delete on app.fighters to mmmma_backoffice, mmmma_service;

grant select (id, event_id, fighter_id, card_name, intake_deadline, intake_completed_at, created_at, updated_at)
  on app.event_fighters
  to mmmma_public_api, mmmma_fighter_portal;

grant select on app.event_fighters to mmmma_backoffice, mmmma_service, mmmma_auditor;

grant insert, update, delete on app.event_fighters to mmmma_backoffice, mmmma_service;

grant select on app.fights to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant insert, update, delete on app.fights to mmmma_backoffice, mmmma_service;

grant select on app.fight_results to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_service, mmmma_auditor;
grant insert, update, delete on app.fight_results to mmmma_backoffice, mmmma_service;

grant select (id, reference_code, event_id, display_name, entry_status, score_cached, perfect_picks_cached, submitted_at, created_at, updated_at)
  on app.fantasy_entries
  to mmmma_public_api;

grant select on app.fantasy_entries to mmmma_backoffice, mmmma_service, mmmma_auditor;

grant insert (
  event_id,
  full_name,
  email,
  whatsapp,
  city,
  state_code,
  marketing_consent,
  source,
  request_id,
  request_origin,
  request_ip_hash,
  user_agent,
  metadata,
  submitted_at
)
  on app.fantasy_entries
  to mmmma_public_api, mmmma_service;

grant update on app.fantasy_entries to mmmma_backoffice, mmmma_service;

grant select on app.fantasy_entry_access_tokens to mmmma_backoffice, mmmma_service;
grant insert, update, delete on app.fantasy_entry_access_tokens to mmmma_backoffice, mmmma_service;

grant select on app.fantasy_picks to mmmma_public_api, mmmma_backoffice, mmmma_service, mmmma_auditor;
grant insert (fantasy_entry_id, fight_id, picked_event_fighter_id, predicted_victory_method, predicted_round)
  on app.fantasy_picks
  to mmmma_public_api, mmmma_service;
grant update, delete on app.fantasy_picks to mmmma_backoffice, mmmma_service;

grant select on app.event_fighter_intakes to mmmma_backoffice, mmmma_service, mmmma_auditor;
grant insert (
  event_fighter_id,
  full_name,
  nickname,
  email,
  phone_whatsapp,
  birth_date,
  cpf_ciphertext,
  cpf_digest,
  cpf_last4,
  pix_key_type,
  pix_key_ciphertext,
  pix_key_digest,
  pix_key_last4,
  has_health_insurance,
  health_insurance_provider,
  record_summary,
  primary_specialty,
  additional_specialties,
  competition_history,
  titles_won,
  life_story,
  funny_story,
  curiosities,
  hobbies,
  source,
  intake_status,
  request_id,
  request_origin,
  request_ip_hash,
  user_agent,
  metadata,
  submitted_at
)
  on app.event_fighter_intakes
  to mmmma_fighter_portal;

grant insert on app.event_fighter_intakes to mmmma_backoffice, mmmma_service;

grant update on app.event_fighter_intakes to mmmma_backoffice, mmmma_service;

grant select on app.event_fighter_intake_photos to mmmma_backoffice, mmmma_service, mmmma_auditor;
grant insert (
  intake_id,
  field_name,
  storage_provider,
  storage_bucket,
  object_key,
  original_file_name,
  content_type,
  byte_size,
  sha256_hex,
  width_px,
  height_px
)
  on app.event_fighter_intake_photos
  to mmmma_fighter_portal, mmmma_backoffice, mmmma_service;

grant update on app.event_fighter_intake_photos to mmmma_backoffice, mmmma_service;

grant select on audit.logged_actions to mmmma_backoffice, mmmma_service, mmmma_auditor;

commit;
