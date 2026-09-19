-- Public registration: drop the one-row lock on Better Auth's "user" table.
drop index if exists folio_single_user;
