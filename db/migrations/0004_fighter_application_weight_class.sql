begin;

do $$
begin
  create type app.fighter_weight_class_enum as enum (
    'atomo-feminino',
    'palha-feminino',
    'mosca-feminino',
    'galo-feminino',
    'pena-feminino',
    'mosca',
    'galo',
    'pena',
    'leve',
    'meio-medio',
    'medio',
    'meio-pesado',
    'pesado'
  );
exception
  when duplicate_object then null;
end;
$$;

alter table app.fighter_applications
  add column if not exists weight_class app.fighter_weight_class_enum;

grant insert (weight_class)
  on app.fighter_applications
  to mmmma_public_api, mmmma_service;

commit;
