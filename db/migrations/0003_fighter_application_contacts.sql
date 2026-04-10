begin;

do $$
begin
  create type app.fighter_application_contact_role_enum as enum (
    'athlete',
    'booking_contact'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists app.fighter_application_contacts (
  id uuid primary key default gen_random_uuid(),
  fighter_application_id uuid not null references app.fighter_applications (id) on delete cascade,
  contact_role app.fighter_application_contact_role_enum not null,
  contact_name text,
  phone_whatsapp text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fighter_application_id, contact_role),
  check (char_length(phone_whatsapp) between 10 and 40),
  check (
    (contact_role = 'athlete' and contact_name is null)
    or (
      contact_role = 'booking_contact'
      and char_length(contact_name) between 3 and 160
    )
  )
);

create index if not exists fighter_application_contacts_fighter_application_id_idx
  on app.fighter_application_contacts (fighter_application_id, created_at desc);

create trigger fighter_application_contacts_touch_updated_at
before update on app.fighter_application_contacts
for each row
execute function app.touch_updated_at();

create trigger fighter_application_contacts_audit
after insert or update or delete on app.fighter_application_contacts
for each row
execute function audit.log_row_change('phone_whatsapp');

alter table app.fighter_application_contacts enable row level security;
alter table app.fighter_application_contacts force row level security;

create policy fighter_application_contacts_internal_read_policy
on app.fighter_application_contacts
for select
using ((select app.is_internal_read_role()));

create policy fighter_application_contacts_public_insert_policy
on app.fighter_application_contacts
for insert
with check (
  (select app.is_public_api_role()) or (select app.is_service_role())
);

create policy fighter_application_contacts_internal_update_policy
on app.fighter_application_contacts
for update
using ((select app.is_internal_write_role()))
with check ((select app.is_internal_write_role()));

grant insert (
  fighter_application_id,
  contact_role,
  contact_name,
  phone_whatsapp,
  metadata
)
  on app.fighter_application_contacts
  to mmmma_public_api, mmmma_service;

grant select, update on app.fighter_application_contacts
  to mmmma_backoffice, mmmma_service, mmmma_auditor;

commit;
