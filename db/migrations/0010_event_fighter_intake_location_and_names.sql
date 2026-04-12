begin;

alter table app.event_fighter_intakes
  add column if not exists state_code char(2) references app.brazilian_states (code),
  add column if not exists coach_name text,
  add column if not exists manager_name text;

alter table app.event_fighter_intakes
  drop constraint if exists event_fighter_intakes_coach_name_optional_check,
  drop constraint if exists event_fighter_intakes_manager_name_optional_check;

alter table app.event_fighter_intakes
  add constraint event_fighter_intakes_coach_name_optional_check
    check (coach_name is null or char_length(coach_name) between 2 and 180),
  add constraint event_fighter_intakes_manager_name_optional_check
    check (manager_name is null or char_length(manager_name) between 2 and 180);

grant insert (
  state_code,
  coach_name,
  manager_name
)
  on app.event_fighter_intakes
  to mmmma_fighter_portal;

commit;
