-- Only admin / user. Collapse leftover author and editor rows.
update user_roles set role = 'reader' where role in ('author', 'editor');
alter table user_roles alter column role set default 'reader';
