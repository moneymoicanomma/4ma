begin;

create schema if not exists extensions;

do $$
declare
  v_pgcrypto_schema text;
begin
  select n.nspname
  into v_pgcrypto_schema
  from pg_extension e
  join pg_namespace n
    on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if v_pgcrypto_schema is null then
    create extension if not exists pgcrypto with schema extensions;
  elsif v_pgcrypto_schema <> 'extensions' then
    alter extension pgcrypto set schema extensions;
  end if;
end;
$$;

grant usage on schema extensions
  to mmmma_public_api, mmmma_backoffice, mmmma_fighter_portal, mmmma_auditor, mmmma_service;

commit;
