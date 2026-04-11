begin;

alter table app.fighter_applications
  add column if not exists state_code char(2) references app.brazilian_states (code);

update app.fighter_applications as fighter_application
set
  city = migrated.city,
  state_code = migrated.state_code
from (
  select
    application.id,
    trim(
      regexp_replace(
        application.city,
        '[[:space:]]*[-,/]?[[:space:]]*' || state.code || '$',
        '',
        'i'
      )
    ) as city,
    state.code as state_code
  from app.fighter_applications as application
  join app.brazilian_states as state
    on application.state_code is null
   and application.city ~* ('[[:space:]]*[-,/]?[[:space:]]*' || state.code || '$')
) as migrated
where fighter_application.id = migrated.id
  and char_length(migrated.city) >= 3;

update app.fighter_applications as fighter_application
set
  city = migrated.city,
  state_code = migrated.state_code
from (
  select
    application.id,
    trim(
      regexp_replace(
        application.city,
        '[[:space:]]*[-,/]?[[:space:]]*' || state.name || '$',
        '',
        'i'
      )
    ) as city,
    state.code as state_code
  from app.fighter_applications as application
  join app.brazilian_states as state
    on application.state_code is null
   and application.city ~* ('[[:space:]]*[-,/]?[[:space:]]*' || state.name || '$')
) as migrated
where fighter_application.id = migrated.id
  and char_length(migrated.city) >= 3;

grant insert (state_code)
  on app.fighter_applications
  to mmmma_public_api, mmmma_service;

commit;
