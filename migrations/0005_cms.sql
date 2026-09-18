alter table posts add column if not exists deleted_at timestamptz;
create index if not exists posts_deleted_at_idx on posts (deleted_at);

create table if not exists post_revisions (
  id serial primary key,
  post_id integer not null references posts(id) on delete cascade,
  title text not null,
  excerpt text not null,
  body text not null,
  editor_id text not null,
  editor_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists post_revisions_post_id_idx on post_revisions (post_id, created_at desc);

create table if not exists user_roles (
  user_id text primary key,
  role text not null default 'author',
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id serial primary key,
  user_id text not null,
  filename text not null,
  mime_type text not null,
  size_bytes integer not null default 0,
  url text not null,
  alt text not null default '',
  group_name text not null default '未分组',
  data bytea,
  created_at timestamptz not null default now()
);

create index if not exists attachments_user_id_idx on attachments (user_id);
