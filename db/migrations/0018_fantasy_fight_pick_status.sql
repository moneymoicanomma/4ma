begin;

do $$
begin
  create type app.fight_pick_status_enum as enum (
    'open',
    'closed'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table app.fights
  add column if not exists pick_status app.fight_pick_status_enum not null default 'open';

update app.fights fight
set pick_status = 'closed'
from app.events event
where event.id = fight.event_id
  and event.status in ('locked', 'finished');

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

  if v_fight.pick_status <> 'open' and not app.is_internal_write_role() then
    raise exception 'fight is closed for fantasy picks';
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

commit;
