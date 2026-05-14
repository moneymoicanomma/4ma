begin;

create or replace function app.generate_reference_code(p_prefix text default 'FAN')
returns text
language plpgsql
volatile
set search_path = pg_catalog, app
as $$
declare
  v_prefix text;
  v_candidate text;
begin
  v_prefix := upper(left(regexp_replace(coalesce(p_prefix, 'FAN'), '[^A-Za-z0-9]', '', 'g'), 3));

  if v_prefix = '' then
    v_prefix := 'FAN';
  end if;

  loop
    v_candidate := v_prefix || '-' || upper(encode(extensions.gen_random_bytes(4), 'hex'));
    exit when not exists (
      select 1
      from app.fantasy_entries
      where reference_code = v_candidate
    );
  end loop;

  return v_candidate;
end;
$$;

commit;
