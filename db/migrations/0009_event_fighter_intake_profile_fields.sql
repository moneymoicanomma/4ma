begin;

alter table app.event_fighter_intakes
  add column if not exists category text,
  add column if not exists height text,
  add column if not exists reach text,
  add column if not exists city text,
  add column if not exists education_level text,
  add column if not exists team text,
  add column if not exists fight_graduations text,
  add column if not exists tapology_profile text,
  add column if not exists instagram_profile text,
  add column if not exists coach_contact text,
  add column if not exists manager_contact text,
  add column if not exists corner_one_name text,
  add column if not exists corner_two_name text;

alter table app.event_fighter_intakes
  drop constraint if exists event_fighter_intakes_category_optional_check,
  drop constraint if exists event_fighter_intakes_height_optional_check,
  drop constraint if exists event_fighter_intakes_reach_optional_check,
  drop constraint if exists event_fighter_intakes_city_optional_check,
  drop constraint if exists event_fighter_intakes_education_level_optional_check,
  drop constraint if exists event_fighter_intakes_team_optional_check,
  drop constraint if exists event_fighter_intakes_fight_graduations_optional_check,
  drop constraint if exists event_fighter_intakes_tapology_profile_optional_check,
  drop constraint if exists event_fighter_intakes_instagram_profile_optional_check,
  drop constraint if exists event_fighter_intakes_coach_contact_optional_check,
  drop constraint if exists event_fighter_intakes_manager_contact_optional_check,
  drop constraint if exists event_fighter_intakes_corner_one_name_optional_check,
  drop constraint if exists event_fighter_intakes_corner_two_name_optional_check;

alter table app.event_fighter_intakes
  add constraint event_fighter_intakes_category_optional_check
    check (category is null or char_length(category) between 2 and 180),
  add constraint event_fighter_intakes_height_optional_check
    check (height is null or char_length(height) between 2 and 60),
  add constraint event_fighter_intakes_reach_optional_check
    check (reach is null or char_length(reach) between 2 and 60),
  add constraint event_fighter_intakes_city_optional_check
    check (city is null or char_length(city) between 2 and 180),
  add constraint event_fighter_intakes_education_level_optional_check
    check (education_level is null or char_length(education_level) between 2 and 180),
  add constraint event_fighter_intakes_team_optional_check
    check (team is null or char_length(team) between 2 and 180),
  add constraint event_fighter_intakes_fight_graduations_optional_check
    check (fight_graduations is null or char_length(fight_graduations) between 2 and 320),
  add constraint event_fighter_intakes_tapology_profile_optional_check
    check (tapology_profile is null or char_length(tapology_profile) between 6 and 320),
  add constraint event_fighter_intakes_instagram_profile_optional_check
    check (instagram_profile is null or char_length(instagram_profile) between 6 and 320),
  add constraint event_fighter_intakes_coach_contact_optional_check
    check (coach_contact is null or char_length(coach_contact) between 8 and 180),
  add constraint event_fighter_intakes_manager_contact_optional_check
    check (manager_contact is null or char_length(manager_contact) between 8 and 180),
  add constraint event_fighter_intakes_corner_one_name_optional_check
    check (corner_one_name is null or char_length(corner_one_name) between 2 and 180),
  add constraint event_fighter_intakes_corner_two_name_optional_check
    check (corner_two_name is null or char_length(corner_two_name) between 2 and 180);

grant insert (
  category,
  height,
  reach,
  city,
  education_level,
  team,
  fight_graduations,
  tapology_profile,
  instagram_profile,
  coach_contact,
  manager_contact,
  corner_one_name,
  corner_two_name
)
  on app.event_fighter_intakes
  to mmmma_fighter_portal;

commit;
