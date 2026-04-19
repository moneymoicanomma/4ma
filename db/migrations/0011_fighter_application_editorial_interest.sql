begin;

do $$
begin
  create type app.fighter_application_editorial_interest_enum as enum (
    'interessante',
    'talvez_no_futuro',
    'nao_interessante',
    'bizarro'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table app.fighter_applications
  add column if not exists editorial_interest app.fighter_application_editorial_interest_enum;

create index if not exists fighter_applications_editorial_interest_idx
  on app.fighter_applications (editorial_interest, created_at desc)
  where editorial_interest is not null;

commit;
