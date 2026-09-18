alter table attachments add column if not exists object_key text;
create index if not exists attachments_object_key_idx on attachments (object_key);
