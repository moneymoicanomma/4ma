begin;

do $$
begin
  create type app.press_credential_status_enum as enum (
    'new',
    'reviewing',
    'approved',
    'rejected',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists app.press_credentials (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  media_outlet text not null,
  document_number text not null,
  coverage_type text not null,
  coverage_needs text not null default '',
  source text not null,
  status app.press_credential_status_enum not null default 'new',
  assigned_account_id uuid references app.accounts (id) on delete set null,
  reviewed_at timestamptz,
  reviewer_notes text,
  request_id text,
  request_origin text,
  request_ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = app.normalize_email_text(email)),
  check (char_length(full_name) between 3 and 180),
  check (char_length(email) between 6 and 160),
  check (char_length(media_outlet) between 3 and 640),
  check (char_length(document_number) between 3 and 180),
  check (char_length(coverage_type) between 3 and 180),
  check (coverage_needs = '' or char_length(coverage_needs) between 10 and 1600),
  check (request_ip_hash is null or request_ip_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists press_credentials_status_idx
  on app.press_credentials (status, created_at desc);

create index if not exists press_credentials_assigned_account_id_idx
  on app.press_credentials (assigned_account_id);

create trigger press_credentials_touch_updated_at
before update on app.press_credentials
for each row
execute function app.touch_updated_at();

create trigger press_credentials_normalize_email
before insert or update on app.press_credentials
for each row
execute function app.normalize_email_column();

create trigger press_credentials_audit
after insert or update or delete on app.press_credentials
for each row
execute function audit.log_row_change(
  'email',
  'document_number',
  'request_ip_hash',
  'user_agent'
);

alter table app.press_credentials enable row level security;
alter table app.press_credentials force row level security;

create policy press_credentials_internal_read_policy
on app.press_credentials
for select
using ((select app.is_internal_read_role()));

create policy press_credentials_public_insert_policy
on app.press_credentials
for insert
with check (
  ((select app.is_public_api_role()) or (select app.is_service_role()))
  and status = 'new'
);

create policy press_credentials_internal_update_policy
on app.press_credentials
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

grant insert (
  full_name,
  email,
  media_outlet,
  document_number,
  coverage_type,
  coverage_needs,
  source,
  request_id,
  request_origin,
  request_ip_hash,
  user_agent,
  metadata
)
  on app.press_credentials
  to mmmma_public_api, mmmma_service;

grant select, update on app.press_credentials to mmmma_backoffice, mmmma_service, mmmma_auditor;

commit;
