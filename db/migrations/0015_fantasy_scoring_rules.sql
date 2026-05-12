begin;

alter table app.fantasy_scoring_profiles
  alter column winner_points set default 1,
  alter column method_points set default 1,
  alter column round_points set default 1,
  alter column perfect_pick_bonus set default 1;

update app.fantasy_scoring_profiles
set
  winner_points = 1,
  method_points = 1,
  round_points = 1,
  perfect_pick_bonus = 1,
  updated_at = now()
where is_default
  or (
    winner_points = 10
    and method_points = 6
    and round_points = 4
    and perfect_pick_bonus = 3
  );

update app.fight_results
set
  official_round = 3,
  updated_at = now()
where victory_method = 'decisao'
  and official_round <> 3;

update app.fantasy_picks
set
  predicted_round = 3,
  updated_at = now()
where predicted_victory_method = 'decisao'
  and predicted_round <> 3;

create or replace function app.refresh_fantasy_entry_scores(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, app
as $$
begin
  with score_rollup as (
    select
      fe.id as fantasy_entry_id,
      coalesce(sum(
        case
          when fr.winner_event_fighter_id is not null
            and fp.picked_event_fighter_id = fr.winner_event_fighter_id
          then
            sp.winner_points +
            (case when fr.victory_method is not null and fp.predicted_victory_method = fr.victory_method then sp.method_points else 0 end) +
            (case when fr.official_round is not null and fp.predicted_round = fr.official_round then sp.round_points else 0 end) +
            (
              case
                when fr.victory_method is not null
                  and fr.official_round is not null
                  and fp.predicted_victory_method = fr.victory_method
                  and fp.predicted_round = fr.official_round
                then sp.perfect_pick_bonus
                else 0
              end
            )
          else 0
        end
      ), 0)::integer as total_score,
      coalesce(sum(
        case
          when fr.winner_event_fighter_id is not null
            and fr.victory_method is not null
            and fr.official_round is not null
            and fp.picked_event_fighter_id = fr.winner_event_fighter_id
            and fp.predicted_victory_method = fr.victory_method
            and fp.predicted_round = fr.official_round
          then 1
          else 0
        end
      ), 0)::integer as perfect_picks
    from app.fantasy_entries fe
    join app.events e
      on e.id = fe.event_id
    join app.fantasy_scoring_profiles sp
      on sp.id = e.scoring_profile_id
    left join app.fantasy_picks fp
      on fp.fantasy_entry_id = fe.id
    left join app.fight_results fr
      on fr.fight_id = fp.fight_id
    where fe.event_id = p_event_id
    group by fe.id
  )
  update app.fantasy_entries fe
  set
    score_cached = sr.total_score,
    perfect_picks_cached = sr.perfect_picks,
    updated_at = now()
  from score_rollup sr
  where sr.fantasy_entry_id = fe.id;
end;
$$;

do $$
declare
  v_event_id uuid;
begin
  for v_event_id in
    select id from app.events
  loop
    perform app.refresh_fantasy_entry_scores(v_event_id);
  end loop;
end;
$$;

commit;
