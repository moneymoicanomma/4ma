begin;

do $$
begin
  create type app.contact_message_status_enum as enum (
    'new',
    'responded',
    'archived'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists app.contact_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  full_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  source text not null,
  status app.contact_message_status_enum not null default 'new',
  assigned_account_id uuid references app.accounts (id) on delete set null,
  responded_at timestamptz,
  reviewer_notes text,
  request_id text,
  request_origin text,
  request_ip_hash text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (recipient_email = app.normalize_email_text(recipient_email)),
  check (email = app.normalize_email_text(email)),
  check (char_length(recipient_email) between 6 and 160),
  check (char_length(full_name) between 3 and 160),
  check (char_length(email) between 6 and 160),
  check (char_length(subject) between 3 and 160),
  check (char_length(message) between 10 and 2000),
  check (request_ip_hash is null or request_ip_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists contact_messages_status_idx
  on app.contact_messages (status, created_at desc);

create index if not exists contact_messages_assigned_account_id_idx
  on app.contact_messages (assigned_account_id);

create trigger contact_messages_touch_updated_at
before update on app.contact_messages
for each row
execute function app.touch_updated_at();

create trigger contact_messages_normalize_email
before insert or update on app.contact_messages
for each row
execute function app.normalize_email_column();

create trigger contact_messages_audit
after insert or update or delete on app.contact_messages
for each row
execute function audit.log_row_change(
  'recipient_email',
  'email',
  'request_ip_hash',
  'user_agent'
);

alter table app.contact_messages enable row level security;
alter table app.contact_messages force row level security;

create policy contact_messages_internal_read_policy
on app.contact_messages
for select
using ((select app.is_internal_read_role()));

create policy contact_messages_public_insert_policy
on app.contact_messages
for insert
with check (
  ((select app.is_public_api_role()) or (select app.is_service_role()))
  and status = 'new'
);

create policy contact_messages_internal_update_policy
on app.contact_messages
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

grant insert (
  recipient_email,
  full_name,
  email,
  subject,
  message,
  source,
  request_id,
  request_origin,
  request_ip_hash,
  user_agent,
  metadata
)
  on app.contact_messages
  to mmmma_public_api, mmmma_service;

grant select, update on app.contact_messages to mmmma_backoffice, mmmma_service, mmmma_auditor;

commit;
