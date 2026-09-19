-- New accounts are regular readers. Authors are granted by an admin.
alter table user_roles alter column role set default 'reader';
