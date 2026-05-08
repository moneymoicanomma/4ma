begin;

create policy fighter_applications_internal_delete_policy
on app.fighter_applications
for delete
using ((select app.is_internal_write_role()));

grant delete on app.fighter_applications to mmmma_backoffice, mmmma_service;

commit;
