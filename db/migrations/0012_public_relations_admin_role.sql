begin;

alter type app.account_role_enum add value if not exists 'public_relations';

commit;
