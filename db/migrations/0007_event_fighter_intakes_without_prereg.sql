begin;

alter table app.event_fighter_intakes
  alter column event_fighter_id drop not null;

create unique index if not exists event_fighter_intakes_unlinked_source_email_idx
  on app.event_fighter_intakes (source, email)
  where event_fighter_id is null;

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

  if new.event_fighter_id is null then
    if not app.is_internal_write_role() then
      raise exception 'event fighter intake without pre-registration requires an internal write role';
    end if;

    return new;
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

commit;
