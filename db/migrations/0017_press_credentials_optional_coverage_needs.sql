begin;

alter table app.press_credentials
  alter column coverage_needs set default '',
  alter column coverage_needs set not null;

alter table app.press_credentials
  drop constraint if exists press_credentials_coverage_needs_check;

alter table app.press_credentials
  add constraint press_credentials_coverage_needs_check
  check (coverage_needs = '' or char_length(coverage_needs) between 10 and 1600);

commit;
