-- Personal blog: at most one row in Better Auth's "user" table.
-- Skip when a preview database already has more than one account so migrate
-- does not fail; Docker first-boot creates the owner before the server starts.
do $$
begin
  if (select count(*) from "user") <= 1 then
    execute 'create unique index if not exists folio_single_user on "user" ((1))';
  end if;
end $$;
