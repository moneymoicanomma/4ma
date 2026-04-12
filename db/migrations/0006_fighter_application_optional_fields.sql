begin;

alter table app.fighter_applications
  alter column full_name drop not null,
  alter column nickname drop not null,
  alter column birth_date drop not null,
  alter column city drop not null,
  alter column team drop not null,
  alter column tapology_profile drop not null,
  alter column instagram_profile drop not null,
  alter column competition_history drop not null,
  alter column martial_arts_titles drop not null,
  alter column curiosities drop not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint as con
    join pg_class as rel on rel.oid = con.conrelid
    join pg_namespace as nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'app'
      and rel.relname = 'fighter_applications'
      and con.contype = 'c'
      and (
        position('char_length(full_name)' in pg_get_constraintdef(con.oid)) > 0
        or position('char_length(nickname)' in pg_get_constraintdef(con.oid)) > 0
        or position('char_length(city)' in pg_get_constraintdef(con.oid)) > 0
        or position('char_length(team)' in pg_get_constraintdef(con.oid)) > 0
        or position('char_length(tapology_profile)' in pg_get_constraintdef(con.oid)) > 0
        or position('char_length(instagram_profile)' in pg_get_constraintdef(con.oid)) > 0
        or position('specialty <> ''other''' in pg_get_constraintdef(con.oid)) > 0
      )
  loop
    execute format('alter table app.fighter_applications drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table app.fighter_applications
  drop constraint if exists fighter_applications_full_name_optional_check,
  drop constraint if exists fighter_applications_nickname_optional_check,
  drop constraint if exists fighter_applications_city_optional_check,
  drop constraint if exists fighter_applications_team_optional_check,
  drop constraint if exists fighter_applications_tapology_profile_optional_check,
  drop constraint if exists fighter_applications_instagram_profile_optional_check,
  drop constraint if exists fighter_applications_specialty_other_optional_check,
  drop constraint if exists fighter_applications_competition_history_optional_check,
  drop constraint if exists fighter_applications_martial_arts_titles_optional_check,
  drop constraint if exists fighter_applications_curiosities_optional_check;

alter table app.fighter_applications
  add constraint fighter_applications_full_name_optional_check
    check (full_name is null or char_length(full_name) <= 160),
  add constraint fighter_applications_nickname_optional_check
    check (nickname is null or char_length(nickname) <= 160),
  add constraint fighter_applications_city_optional_check
    check (city is null or char_length(city) <= 160),
  add constraint fighter_applications_team_optional_check
    check (team is null or char_length(team) <= 160),
  add constraint fighter_applications_tapology_profile_optional_check
    check (tapology_profile is null or char_length(tapology_profile) <= 220),
  add constraint fighter_applications_instagram_profile_optional_check
    check (instagram_profile is null or char_length(instagram_profile) <= 220),
  add constraint fighter_applications_specialty_other_optional_check
    check (specialty_other is null or char_length(specialty_other) <= 120),
  add constraint fighter_applications_competition_history_optional_check
    check (competition_history is null or char_length(competition_history) <= 4000),
  add constraint fighter_applications_martial_arts_titles_optional_check
    check (martial_arts_titles is null or char_length(martial_arts_titles) <= 4000),
  add constraint fighter_applications_curiosities_optional_check
    check (curiosities is null or char_length(curiosities) <= 4000);

alter table app.fighter_application_contacts
  alter column phone_whatsapp drop not null;

do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint as con
    join pg_class as rel on rel.oid = con.conrelid
    join pg_namespace as nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'app'
      and rel.relname = 'fighter_application_contacts'
      and con.contype = 'c'
      and (
        position('char_length(phone_whatsapp)' in pg_get_constraintdef(con.oid)) > 0
        or position('booking_contact' in pg_get_constraintdef(con.oid)) > 0
      )
  loop
    execute format('alter table app.fighter_application_contacts drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table app.fighter_application_contacts
  drop constraint if exists fighter_application_contacts_phone_whatsapp_optional_check,
  drop constraint if exists fighter_application_contacts_contact_name_optional_check,
  drop constraint if exists fighter_application_contacts_athlete_name_null_check;

alter table app.fighter_application_contacts
  add constraint fighter_application_contacts_phone_whatsapp_optional_check
    check (phone_whatsapp is null or char_length(phone_whatsapp) between 10 and 40),
  add constraint fighter_application_contacts_contact_name_optional_check
    check (contact_name is null or char_length(contact_name) <= 160),
  add constraint fighter_application_contacts_athlete_name_null_check
    check (contact_role <> 'athlete' or contact_name is null);

commit;
